import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying ISRO Contracts to Avalanche Subnet...");
  console.log("=" .repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);

  // Load configuration
  const configPath = path.join(__dirname, "..", "avalanche-subnet-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration file not found. Run the account generation script first.");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log(`Loaded configuration for ${config.accounts.length} accounts`);

  // Deploy ISRO Token first
  console.log("\n📝 Deploying ISRO Token...");
  const ISROToken = await ethers.getContractFactory("ISROToken");
  
  const tokenName = "ISRO Lunar Mission Token";
  const tokenSymbol = "ISRO";
  const initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens
  const rewardRate = ethers.parseEther("0.000001"); // 0.0001% per second
  const minimumStake = ethers.parseEther("1000"); // 1000 ISRO tokens
  const validatorMinimumStake = ethers.parseEther("10000"); // 10,000 ISRO tokens

  const isroToken = await ISROToken.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    rewardRate,
    minimumStake,
    validatorMinimumStake
  );

  await isroToken.waitForDeployment();
  const tokenAddress = await isroToken.getAddress();
  console.log(`✅ ISRO Token deployed to: ${tokenAddress}`);

  // Deploy ISRO Data Transfer Contract
  console.log("\n📡 Deploying ISRO Data Transfer Contract...");
  const ISRODataTransfer = await ethers.getContractFactory("ISRODataTransfer");
  
  const minimumStakeAVAX = ethers.parseEther("2000000"); // 2M AVAX
  const transferTimeout = 3600; // 1 hour
  const maxDataSize = 100 * 1024 * 1024 * 1024; // 100GB

  const isroDataTransfer = await ISRODataTransfer.deploy(
    minimumStakeAVAX,
    transferTimeout,
    maxDataSize
  );

  await isroDataTransfer.waitForDeployment();
  const dataTransferAddress = await isroDataTransfer.getAddress();
  console.log(`✅ ISRO Data Transfer Contract deployed to: ${dataTransferAddress}`);

  // Register ISRO stations
  console.log("\n🏢 Registering ISRO Stations...");
  
  const stationNames = ["ISRO Bangalore", "ISRO Chennai", "ISRO Delhi", "ISRO Sriharikota"];
  const stationAddresses = config.accounts.map((acc: any) => acc.address);

  for (let i = 0; i < stationAddresses.length; i++) {
    const tx = await isroDataTransfer.registerStation(stationAddresses[i], stationNames[i]);
    await tx.wait();
    console.log(`✅ Registered ${stationNames[i]} at ${stationAddresses[i]}`);
  }

  // Add validators
  console.log("\n🔐 Adding Validators...");
  
  for (let i = 0; i < stationAddresses.length; i++) {
    const tx = await isroDataTransfer.addValidator(stationAddresses[i]);
    await tx.wait();
    console.log(`✅ Added validator: ${stationAddresses[i]}`);
  }

  // Add validators to token contract
  console.log("\n🪙 Adding Validators to Token Contract...");
  
  for (let i = 0; i < stationAddresses.length; i++) {
    const tx = await isroToken.addValidator(stationAddresses[i]);
    await tx.wait();
    console.log(`✅ Added validator to token contract: ${stationAddresses[i]}`);
  }

  // Distribute initial tokens to stations
  console.log("\n💰 Distributing Initial Tokens...");
  
  const tokensPerStation = ethers.parseEther("100000000"); // 100M tokens per station
  
  for (let i = 0; i < stationAddresses.length; i++) {
    const tx = await isroToken.transfer(stationAddresses[i], tokensPerStation);
    await tx.wait();
    console.log(`✅ Sent ${ethers.formatEther(tokensPerStation)} tokens to ${stationAddresses[i]}`);
  }

  // Stake tokens as validators
  console.log("\n🔒 Staking Tokens as Validators...");
  
  const validatorStake = ethers.parseEther("50000000"); // 50M tokens stake
  
  for (let i = 0; i < stationAddresses.length; i++) {
    // Connect as the station account
    const stationSigner = new ethers.Wallet(config.accounts[i].privateKey, ethers.provider);
    const stationToken = isroToken.connect(stationSigner);
    const stationDataTransfer = isroDataTransfer.connect(stationSigner);
    
    // Approve staking
    const approveTx = await stationToken.approve(tokenAddress, validatorStake);
    await approveTx.wait();
    
    // Stake as validator
    const stakeTx = await stationToken.stakeAsValidator(validatorStake);
    await stakeTx.wait();
    
    console.log(`✅ Staked ${ethers.formatEther(validatorStake)} tokens for ${stationAddresses[i]}`);
  }

  // Save deployment information
  const deploymentInfo = {
    network: "Avalanche Mainnet",
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      isroToken: {
        address: tokenAddress,
        name: tokenName,
        symbol: tokenSymbol,
        initialSupply: ethers.formatEther(initialSupply),
        minimumStake: ethers.formatEther(minimumStake),
        validatorMinimumStake: ethers.formatEther(validatorMinimumStake)
      },
      isroDataTransfer: {
        address: dataTransferAddress,
        minimumStakeAVAX: ethers.formatEther(minimumStakeAVAX),
        transferTimeout,
        maxDataSize: `${maxDataSize / (1024 * 1024 * 1024)} GB`
      }
    },
    stations: stationAddresses.map((addr: string, i: number) => ({
      address: addr,
      name: stationNames[i],
      privateKey: config.accounts[i].privateKey
    })),
    validators: stationAddresses,
    totalStake: ethers.formatEther(validatorStake * BigInt(stationAddresses.length))
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n📋 Deployment Information Saved:");
  console.log(`   Token Contract: ${tokenAddress}`);
  console.log(`   Data Transfer Contract: ${dataTransferAddress}`);
  console.log(`   Total Validators: ${stationAddresses.length}`);
  console.log(`   Total Stake: ${ethers.formatEther(validatorStake * BigInt(stationAddresses.length))} ISRO tokens`);
  console.log(`   Deployment Info: ${deploymentPath}`);

  // Verify contracts on Snowtrace
  console.log("\n🔍 Verifying Contracts on Snowtrace...");
  console.log("Run the following commands to verify:");
  console.log(`npx hardhat verify --network avalanche ${tokenAddress} "${tokenName}" "${tokenSymbol}" "${ethers.formatEther(initialSupply)}" "${ethers.formatEther(rewardRate)}" "${ethers.formatEther(minimumStake)}" "${ethers.formatEther(validatorMinimumStake)}"`);
  console.log(`npx hardhat verify --network avalanche ${dataTransferAddress} "${ethers.formatEther(minimumStakeAVAX)}" "${transferTimeout}" "${maxDataSize}"`);

  console.log("\n🎉 Deployment Complete!");
  console.log("The ISRO Avalanche subnet is now operational with:");
  console.log("✅ Smart contracts deployed");
  console.log("✅ 4 ISRO stations registered");
  console.log("✅ Validators configured and staked");
  console.log("✅ Token distribution complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
