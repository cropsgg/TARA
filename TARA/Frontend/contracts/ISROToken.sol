// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ISRO Token
 * @dev ERC20 token for ISRO Avalanche subnet with staking capabilities
 * @author ISRO Development Team
 */
contract ISROToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event ValidatorRewardsDistributed(address indexed validator, uint256 amount, uint256 timestamp);

    // Structs
    struct StakingInfo {
        uint256 stakedAmount;
        uint256 stakingTime;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
        bool isActive;
    }

    struct ValidatorStake {
        address validatorAddress;
        uint256 stakedAmount;
        uint256 stakingTime;
        uint256 uptime;
        uint256 lastValidationTime;
        bool isActive;
    }

    // State variables
    mapping(address => StakingInfo) public stakingInfo;
    mapping(address => ValidatorStake) public validatorStakes;
    mapping(address => bool) public isValidator;
    
    uint256 public totalStaked;
    uint256 public totalValidatorStaked;
    uint256 public rewardRate; // Rewards per second per token staked
    uint256 public minimumStake;
    uint256 public validatorMinimumStake;
    uint256 public lastRewardUpdateTime;
    
    uint256 public constant REWARD_PRECISION = 1e18;
    uint256 public constant MAX_REWARD_RATE = 1e15; // 0.1% per second max

    // Modifiers
    modifier onlyValidator() {
        require(isValidator[msg.sender], "ISRO: Caller is not a validator");
        _;
    }

    modifier hasStake() {
        require(stakingInfo[msg.sender].stakedAmount > 0, "ISRO: No stake found");
        _;
    }

    modifier hasValidatorStake() {
        require(validatorStakes[msg.sender].stakedAmount > 0, "ISRO: No validator stake found");
        _;
    }

    // Constructor
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 _rewardRate,
        uint256 _minimumStake,
        uint256 _validatorMinimumStake
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        rewardRate = _rewardRate;
        minimumStake = _minimumStake;
        validatorMinimumStake = _validatorMinimumStake;
        lastRewardUpdateTime = block.timestamp;
    }

    // Staking Functions

    /**
     * @dev Stake tokens for regular users
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "ISRO: Cannot stake 0 tokens");
        require(amount >= minimumStake, "ISRO: Below minimum stake requirement");
        require(balanceOf(msg.sender) >= amount, "ISRO: Insufficient token balance");

        // Update rewards before staking
        _updateRewards(msg.sender);

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update staking info
        if (stakingInfo[msg.sender].isActive) {
            stakingInfo[msg.sender].stakedAmount += amount;
        } else {
            stakingInfo[msg.sender] = StakingInfo({
                stakedAmount: amount,
                stakingTime: block.timestamp,
                lastRewardTime: block.timestamp,
                accumulatedRewards: 0,
                isActive: true
            });
        }

        totalStaked += amount;

        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Stake tokens as a validator
     * @param amount Amount of tokens to stake
     */
    function stakeAsValidator(uint256 amount) external nonReentrant {
        require(amount > 0, "ISRO: Cannot stake 0 tokens");
        require(amount >= validatorMinimumStake, "ISRO: Below validator minimum stake");
        require(balanceOf(msg.sender) >= amount, "ISRO: Insufficient token balance");
        require(isValidator[msg.sender], "ISRO: Caller is not a validator");

        // Update rewards before staking
        _updateRewards(msg.sender);

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);

        // Update validator staking info
        if (validatorStakes[msg.sender].isActive) {
            validatorStakes[msg.sender].stakedAmount += amount;
        } else {
            validatorStakes[msg.sender] = ValidatorStake({
                validatorAddress: msg.sender,
                stakedAmount: amount,
                stakingTime: block.timestamp,
                uptime: 100, // Start with 100% uptime
                lastValidationTime: block.timestamp,
                isActive: true
            });
        }

        totalStaked += amount;
        totalValidatorStaked += amount;

        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Unstake tokens
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external nonReentrant hasStake {
        require(amount > 0, "ISRO: Cannot unstake 0 tokens");
        require(stakingInfo[msg.sender].stakedAmount >= amount, "ISRO: Insufficient staked amount");

        // Update rewards before unstaking
        _updateRewards(msg.sender);

        // Update staking info
        stakingInfo[msg.sender].stakedAmount -= amount;
        totalStaked -= amount;

        // If validator, also update validator stakes
        if (isValidator[msg.sender] && validatorStakes[msg.sender].isActive) {
            validatorStakes[msg.sender].stakedAmount -= amount;
            totalValidatorStaked -= amount;
        }

        // Deactivate if no more stake
        if (stakingInfo[msg.sender].stakedAmount == 0) {
            stakingInfo[msg.sender].isActive = false;
        }

        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant hasStake {
        _updateRewards(msg.sender);
        
        uint256 rewards = stakingInfo[msg.sender].accumulatedRewards;
        require(rewards > 0, "ISRO: No rewards to claim");

        stakingInfo[msg.sender].accumulatedRewards = 0;
        stakingInfo[msg.sender].lastRewardTime = block.timestamp;

        // Mint new tokens as rewards
        _mint(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }

    // Validator Functions

    /**
     * @dev Update validator uptime and validation time
     * @param uptime New uptime percentage (0-100)
     */
    function updateValidatorStatus(uint256 uptime) external onlyValidator hasValidatorStake {
        require(uptime <= 100, "ISRO: Invalid uptime percentage");
        
        validatorStakes[msg.sender].uptime = uptime;
        validatorStakes[msg.sender].lastValidationTime = block.timestamp;
    }

    /**
     * @dev Distribute validator rewards based on performance
     * @param validator Address of the validator
     * @param rewardAmount Amount of rewards to distribute
     */
    function distributeValidatorRewards(address validator, uint256 rewardAmount) external onlyOwner {
        require(isValidator[validator], "ISRO: Invalid validator address");
        require(rewardAmount > 0, "ISRO: Invalid reward amount");

        // Mint rewards to validator
        _mint(validator, rewardAmount);

        emit ValidatorRewardsDistributed(validator, rewardAmount, block.timestamp);
    }

    // Internal Functions

    /**
     * @dev Update rewards for a user
     * @param user Address of the user
     */
    function _updateRewards(address user) internal {
        StakingInfo storage info = stakingInfo[user];
        
        if (!info.isActive || info.stakedAmount == 0) {
            return;
        }

        uint256 currentTime = block.timestamp;
        uint256 timeElapsed = currentTime - info.lastRewardTime;
        
        if (timeElapsed > 0) {
            uint256 rewards = (info.stakedAmount * rewardRate * timeElapsed) / REWARD_PRECISION;
            info.accumulatedRewards += rewards;
            info.lastRewardTime = currentTime;
        }
    }

    // View Functions

    /**
     * @dev Get user's staking information
     * @param user Address of the user
     * @return Staking information
     */
    function getUserStakingInfo(address user) external view returns (StakingInfo memory) {
        return stakingInfo[user];
    }

    /**
     * @dev Get validator's staking information
     * @param validator Address of the validator
     * @return Validator staking information
     */
    function getValidatorStakingInfo(address validator) external view returns (ValidatorStake memory) {
        return validatorStakes[validator];
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user Address of the user
     * @return Pending rewards amount
     */
    function getPendingRewards(address user) external view returns (uint256) {
        StakingInfo storage info = stakingInfo[user];
        
        if (!info.isActive || info.stakedAmount == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - info.lastRewardTime;
        uint256 rewards = (info.stakedAmount * rewardRate * timeElapsed) / REWARD_PRECISION;
        
        return info.accumulatedRewards + rewards;
    }

    /**
     * @dev Get total staking statistics
     * @return Total staked, total validator staked, reward rate
     */
    function getStakingStats() external view returns (
        uint256 total,
        uint256 validatorTotal,
        uint256 rate
    ) {
        return (totalStaked, totalValidatorStaked, rewardRate);
    }

    // Admin Functions

    /**
     * @dev Add a new validator
     * @param validator Address of the validator
     */
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "ISRO: Invalid validator address");
        require(!isValidator[validator], "ISRO: Validator already exists");

        isValidator[validator] = true;
    }

    /**
     * @dev Remove a validator
     * @param validator Address of the validator
     */
    function removeValidator(address validator) external onlyOwner {
        require(isValidator[validator], "ISRO: Validator not found");

        isValidator[validator] = false;
    }

    /**
     * @dev Update reward rate
     * @param newRate New reward rate
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= MAX_REWARD_RATE, "ISRO: Reward rate too high");
        
        // Update rewards for all stakers before changing rate
        _updateGlobalRewards();
        
        rewardRate = newRate;
        lastRewardUpdateTime = block.timestamp;
    }

    /**
     * @dev Update minimum stake requirements
     * @param newMinStake New minimum stake
     * @param newValidatorMinStake New validator minimum stake
     */
    function updateMinimumStakes(uint256 newMinStake, uint256 newValidatorMinStake) external onlyOwner {
        minimumStake = newMinStake;
        validatorMinimumStake = newValidatorMinStake;
    }

    /**
     * @dev Update rewards for all stakers
     */
    function _updateGlobalRewards() internal {
        // This would iterate through all stakers in a production contract
        // For now, we'll just update the timestamp
        lastRewardUpdateTime = block.timestamp;
    }

    // Override functions

    /**
     * @dev Override transfer to allow staking contract transfers
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._transfer(from, to, amount);
    }

    /**
     * @dev Override mint to allow reward distribution
     */
    function _mint(address to, uint256 amount) internal virtual override {
        super._mint(to, amount);
    }
}
