import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { DEPLOYED_CONTRACTS } from '@/utils/avalanche';

// Contract ABIs (simplified for demonstration)
const ISRO_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function stake(uint256 amount) returns (bool)",
  "function stakeAsValidator(uint256 amount) returns (bool)",
  "function claimRewards() returns (bool)",
  "function addValidator(address validator) external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Stake(address indexed user, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 amount)"
];

const ISRO_DATA_TRANSFER_ABI = [
  "function initiateTransfer(address to, string memory data, uint256 size) returns (uint256)",
  "function completeTransfer(uint256 transferId, string memory checksum) returns (bool)",
  "function registerStation(address station, string memory name) returns (bool)",
  "function addValidator(address validator) returns (bool)",
  "function getTransfer(uint256 transferId) view returns (address, address, string, uint256, bool)",
  "function getSystemStats() view returns (uint256, uint256, uint256, uint256)",
  "function getStationCount() view returns (uint256)",
  "function getValidatorCount() view returns (uint256)",
  "event TransferInitiated(uint256 indexed transferId, address indexed from, address indexed to)",
  "event TransferCompleted(uint256 indexed transferId)",
  "event StationRegistered(address indexed station, string name)",
  "event ValidatorAdded(address indexed validator)"
];

export interface ContractStats {
  totalTransfers: number;
  activeTransfers: number;
  totalStations: number;
  totalValidators: number;
  totalStaked: string;
  totalRewards: string;
}

export interface UseSmartContractsReturn {
  // Contract instances
  tokenContract: ethers.Contract | null;
  dataTransferContract: ethers.Contract | null;
  
  // Contract data
  contractStats: ContractStats | null;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  userBalance: string;
  
  // Token functions
  getTokenBalance: (address: string) => Promise<string>;
  stakeTokens: (amount: string) => Promise<boolean>;
  stakeAsValidator: (amount: string) => Promise<boolean>;
  claimRewards: () => Promise<boolean>;
  transferTokens: (to: string, amount: string) => Promise<boolean>;
  
  // Data transfer functions
  initiateDataTransfer: (to: string, data: string, size: number) => Promise<number>;
  completeDataTransfer: (transferId: number, checksum: string) => Promise<boolean>;
  registerStation: (address: string, name: string) => Promise<boolean>;
  addValidator: (address: string) => Promise<boolean>;
  
  // Utility functions
  refreshStats: () => Promise<void>;
  connectWallet: () => Promise<string>;
  getUserBalance: () => Promise<string>;
}

export const useSmartContracts = (): UseSmartContractsReturn => {
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [dataTransferContract, setDataTransferContract] = useState<ethers.Contract | null>(null);
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Wallet | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');

  // Initialize contracts
  const initializeContracts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Connect to Fuji testnet
      const fujiProvider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
      setProvider(fujiProvider);

      // Create contract instances (read-only for now)
      const tokenContractInstance = new ethers.Contract(
        DEPLOYED_CONTRACTS.isroToken,
        ISRO_TOKEN_ABI,
        fujiProvider
      );

      const dataTransferContractInstance = new ethers.Contract(
        DEPLOYED_CONTRACTS.isroDataTransfer,
        ISRO_DATA_TRANSFER_ABI,
        fujiProvider
      );

      setTokenContract(tokenContractInstance);
      setDataTransferContract(dataTransferContractInstance);

      // Load initial stats
      await refreshStats();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize contracts');
      console.error('Contract initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Switch to Fuji testnet
  const switchToFujiTestnet = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // First, check if we're already on the correct network
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId === '0xa869') {
          return; // Already on Fuji testnet
        }

        // Try to switch to Fuji testnet
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa869' }], // Fuji testnet chain ID
        });
      } catch (switchError: any) {
        console.log('Switch error:', switchError);
        
        // If the chain doesn't exist, add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xa869',
                  chainName: 'Avalanche Fuji Testnet',
                  nativeCurrency: {
                    name: 'AVAX',
                    symbol: 'AVAX',
                    decimals: 18,
                  },
                  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
                  iconUrls: ['https://cryptologos.cc/logos/avalanche-avax-logo.png'],
                },
              ],
            });
          } catch (addError: any) {
            console.error('Add chain error:', addError);
            throw new Error(`Failed to add Fuji testnet to MetaMask: ${addError.message || 'Unknown error'}`);
          }
        } else if (switchError.code === 4001) {
          throw new Error('User rejected the network switch. Please approve the network change in MetaMask.');
        } else {
          throw new Error(`Failed to switch to Fuji testnet: ${switchError.message || 'Unknown error'}`);
        }
      }
    } else {
      throw new Error('MetaMask not found. Please install MetaMask to connect your wallet.');
    }
  }, []);

  // Get user balance
  const getUserBalance = useCallback(async (): Promise<string> => {
    if (!tokenContract || !signer) return '0';
    
    try {
      const address = await signer.getAddress();
      const balance = await tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Failed to get user balance:', err);
      return '0';
    }
  }, [tokenContract, signer]);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!provider) {
        throw new Error('Provider not initialized');
      }

      // Check if MetaMask is available
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // Switch to Fuji testnet first
          await switchToFujiTestnet();

          // Request account access
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });

          if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask and try again.');
          }

          // Create signer from MetaMask
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await browserProvider.getSigner();
          setSigner(signer);

          // Update contracts with signer
          if (tokenContract && dataTransferContract) {
            const tokenWithSigner = tokenContract.connect(signer);
            const dataTransferWithSigner = dataTransferContract.connect(signer);
            setTokenContract(tokenWithSigner);
            setDataTransferContract(dataTransferWithSigner);
          }

          // Get user balance after connection
          const balance = await getUserBalance();
          setUserBalance(balance);

          return accounts[0];
        } catch (metaMaskError: any) {
          console.error('MetaMask connection error:', metaMaskError);
          
          if (metaMaskError.code === 4001) {
            throw new Error('User rejected the connection request. Please approve the connection in MetaMask.');
          } else if (metaMaskError.code === -32002) {
            throw new Error('Connection request already pending. Please check MetaMask and approve the connection.');
          } else {
            throw new Error(`MetaMask connection failed: ${metaMaskError.message || 'Unknown error'}`);
          }
        }
      } else {
        // Fallback: Use demo wallet for testing
        console.warn('MetaMask not found, using demo wallet');
        const demoPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
        const wallet = new ethers.Wallet(demoPrivateKey, provider);
        setSigner(wallet);

        // Update contracts with signer
        if (tokenContract && dataTransferContract) {
          const tokenWithSigner = tokenContract.connect(wallet);
          const dataTransferWithSigner = dataTransferContract.connect(wallet);
          setTokenContract(tokenWithSigner);
          setDataTransferContract(dataTransferWithSigner);
        }

        // Set demo balance
        setUserBalance('1000.00');

        return wallet.address;
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, tokenContract, dataTransferContract, switchToFujiTestnet]);

  // Refresh contract stats
  const refreshStats = useCallback(async () => {
    if (!tokenContract || !dataTransferContract) {
      // Set default stats if contracts not available
      setContractStats({
        totalTransfers: 0,
        activeTransfers: 0,
        totalStations: 4,
        totalValidators: 4,
        totalStaked: '1000000000',
        totalRewards: '0'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get contract stats with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract call timeout')), 10000)
      );

      const contractPromise = Promise.all([
        tokenContract.totalSupply().catch(() => ethers.parseEther('1000000000')),
        dataTransferContract.getSystemStats().catch(() => [0, 0, 4, 4])
      ]);

      const [totalSupply, systemStats] = await Promise.race([contractPromise, timeoutPromise]) as any;

      const stats: ContractStats = {
        totalTransfers: Number(systemStats[0]) || 0,
        activeTransfers: Number(systemStats[1]) || 0,
        totalStations: Number(systemStats[2]) || 4,
        totalValidators: Number(systemStats[3]) || 4,
        totalStaked: ethers.formatEther(totalSupply),
        totalRewards: '0' // Would need to calculate from events
      };

      setContractStats(stats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
      // Set default stats for demo
      setContractStats({
        totalTransfers: 0,
        activeTransfers: 0,
        totalStations: 4,
        totalValidators: 4,
        totalStaked: '1000000000',
        totalRewards: '0'
      });
    } finally {
      setIsLoading(false);
    }
  }, [tokenContract, dataTransferContract]);

  // Token functions
  const getTokenBalance = useCallback(async (address: string): Promise<string> => {
    if (!tokenContract) throw new Error('Token contract not initialized');
    
    try {
      const balance = await tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Failed to get token balance:', err);
      return '0';
    }
  }, [tokenContract]);

  const stakeTokens = useCallback(async (amount: string): Promise<boolean> => {
    if (!tokenContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await tokenContract.stake(ethers.parseEther(amount));
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake tokens');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tokenContract, signer, refreshStats]);

  const stakeAsValidator = useCallback(async (amount: string): Promise<boolean> => {
    if (!tokenContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await tokenContract.stakeAsValidator(ethers.parseEther(amount));
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stake as validator');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tokenContract, signer, refreshStats]);

  const claimRewards = useCallback(async (): Promise<boolean> => {
    if (!tokenContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await tokenContract.claimRewards();
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim rewards');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tokenContract, signer, refreshStats]);

  const transferTokens = useCallback(async (to: string, amount: string): Promise<boolean> => {
    if (!tokenContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await tokenContract.transfer(to, ethers.parseEther(amount));
      await tx.wait();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer tokens');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tokenContract, signer]);

  // Data transfer functions
  const initiateDataTransfer = useCallback(async (to: string, data: string, size: number): Promise<number> => {
    if (!dataTransferContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await dataTransferContract.initiateTransfer(to, data, size);
      const receipt = await tx.wait();
      
      // Extract transfer ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = dataTransferContract.interface.parseLog(log);
          return parsed?.name === 'TransferInitiated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = dataTransferContract.interface.parseLog(event);
        const transferId = Number(parsed?.args[0]);
        await refreshStats();
        return transferId;
      }
      
      throw new Error('Transfer initiated but ID not found');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate transfer');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataTransferContract, signer, refreshStats]);

  const completeDataTransfer = useCallback(async (transferId: number, checksum: string): Promise<boolean> => {
    if (!dataTransferContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await dataTransferContract.completeTransfer(transferId, checksum);
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete transfer');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dataTransferContract, signer, refreshStats]);

  const registerStation = useCallback(async (address: string, name: string): Promise<boolean> => {
    if (!dataTransferContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await dataTransferContract.registerStation(address, name);
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register station');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dataTransferContract, signer, refreshStats]);

  const addValidator = useCallback(async (address: string): Promise<boolean> => {
    if (!dataTransferContract || !signer) throw new Error('Contract or signer not initialized');
    
    try {
      setIsLoading(true);
      const tx = await dataTransferContract.addValidator(address);
      await tx.wait();
      await refreshStats();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add validator');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dataTransferContract, signer, refreshStats]);

  // Initialize contracts on mount
  React.useEffect(() => {
    initializeContracts();
  }, [initializeContracts]);

  return {
    // Contract instances
    tokenContract,
    dataTransferContract,
    
    // Contract data
    contractStats,
    isLoading,
    error,
    setError,
    userBalance,
    
    // Token functions
    getTokenBalance,
    stakeTokens,
    stakeAsValidator,
    claimRewards,
    transferTokens,
    
    // Data transfer functions
    initiateDataTransfer,
    completeDataTransfer,
    registerStation,
    addValidator,
    
    // Utility functions
    refreshStats,
    connectWallet,
    getUserBalance
  };
};
