// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ISRO Data Transfer Contract
 * @dev Secure data transfer system for ISRO lunar mission data
 * @author ISRO Development Team
 */
contract ISRODataTransfer is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Events
    event DataTransferInitiated(
        bytes32 indexed transferId,
        address indexed fromStation,
        address indexed toStation,
        uint256 dataSize,
        uint256 timestamp,
        string checksum
    );

    event DataTransferCompleted(
        bytes32 indexed transferId,
        uint256 timestamp,
        string finalChecksum
    );

    event DataTransferFailed(
        bytes32 indexed transferId,
        string reason,
        uint256 timestamp
    );

    event StationRegistered(
        address indexed stationAddress,
        string stationName,
        uint256 timestamp
    );

    event ValidatorAdded(
        address indexed validatorAddress,
        uint256 timestamp
    );

    event ValidatorRemoved(
        address indexed validatorAddress,
        uint256 timestamp
    );

    // Structs
    struct DataTransfer {
        bytes32 transferId;
        address fromStation;
        address toStation;
        uint256 dataSize;
        uint256 timestamp;
        string checksum;
        TransferStatus status;
        uint256 blockNumber;
        string metadata;
    }

    struct Station {
        string name;
        bool isActive;
        uint256 registrationTime;
        uint256 totalTransfers;
        uint256 successfulTransfers;
        uint256 failedTransfers;
    }

    struct Validator {
        address validatorAddress;
        bool isActive;
        uint256 stake;
        uint256 lastValidationTime;
        uint256 totalValidations;
        uint256 successfulValidations;
    }

    // Enums
    enum TransferStatus {
        Pending,
        Processing,
        Completed,
        Failed,
        Cancelled
    }

    // State variables
    mapping(bytes32 => DataTransfer) public transfers;
    mapping(address => Station) public stations;
    mapping(address => Validator) public validators;
    mapping(address => bool) public isStation;
    mapping(address => bool) public isValidator;

    uint256 public totalTransfers;
    uint256 public activeTransfers;
    uint256 public minimumStake;
    uint256 public transferTimeout;
    uint256 public maxDataSize;

    bytes32 public constant DOMAIN_SEPARATOR = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // Modifiers
    modifier onlyStation() {
        require(isStation[msg.sender], "ISRO: Caller is not a registered station");
        _;
    }

    modifier onlyValidator() {
        require(isValidator[msg.sender], "ISRO: Caller is not a validator");
        _;
    }

    modifier onlyActiveStation() {
        require(isStation[msg.sender] && stations[msg.sender].isActive, "ISRO: Station not active");
        _;
    }

    modifier transferExists(bytes32 transferId) {
        require(transfers[transferId].transferId != bytes32(0), "ISRO: Transfer does not exist");
        _;
    }

    // Constructor
    constructor(
        uint256 _minimumStake,
        uint256 _transferTimeout,
        uint256 _maxDataSize
    ) {
        minimumStake = _minimumStake;
        transferTimeout = _transferTimeout;
        maxDataSize = _maxDataSize;
        
        // Register deployer as owner and first validator
        _addValidator(msg.sender);
    }

    // Core Functions

    /**
     * @dev Initiate a new data transfer
     * @param toStation Recipient station address
     * @param dataSize Size of data in bytes
     * @param checksum SHA-256 hash of the data
     * @param metadata Additional transfer metadata
     */
    function initiateTransfer(
        address toStation,
        uint256 dataSize,
        string calldata checksum,
        string calldata metadata
    ) external onlyActiveStation nonReentrant returns (bytes32) {
        require(toStation != address(0), "ISRO: Invalid recipient station");
        require(toStation != msg.sender, "ISRO: Cannot transfer to self");
        require(isStation[toStation], "ISRO: Recipient not a registered station");
        require(stations[toStation].isActive, "ISRO: Recipient station not active");
        require(dataSize > 0 && dataSize <= maxDataSize, "ISRO: Invalid data size");
        require(bytes(checksum).length > 0, "ISRO: Checksum required");

        bytes32 transferId = keccak256(
            abi.encodePacked(
                msg.sender,
                toStation,
                dataSize,
                checksum,
                block.timestamp,
                block.number
            )
        );

        require(transfers[transferId].transferId == bytes32(0), "ISRO: Transfer ID collision");

        DataTransfer memory newTransfer = DataTransfer({
            transferId: transferId,
            fromStation: msg.sender,
            toStation: toStation,
            dataSize: dataSize,
            timestamp: block.timestamp,
            checksum: checksum,
            status: TransferStatus.Pending,
            blockNumber: block.number,
            metadata: metadata
        });

        transfers[transferId] = newTransfer;
        totalTransfers++;
        activeTransfers++;

        // Update station statistics
        stations[msg.sender].totalTransfers++;
        stations[toStation].totalTransfers++;

        emit DataTransferInitiated(
            transferId,
            msg.sender,
            toStation,
            dataSize,
            block.timestamp,
            checksum
        );

        return transferId;
    }

    /**
     * @dev Complete a data transfer (called by validators)
     * @param transferId ID of the transfer to complete
     * @param finalChecksum Final checksum after transfer
     */
    function completeTransfer(
        bytes32 transferId,
        string calldata finalChecksum
    ) external onlyValidator transferExists(transferId) nonReentrant {
        DataTransfer storage transfer = transfers[transferId];
        
        require(transfer.status == TransferStatus.Processing, "ISRO: Transfer not in processing state");
        require(bytes(finalChecksum).length > 0, "ISRO: Final checksum required");

        transfer.status = TransferStatus.Completed;
        activeTransfers--;

        // Update station statistics
        stations[transfer.fromStation].successfulTransfers++;
        stations[transfer.toStation].successfulTransfers++;

        // Update validator statistics
        validators[msg.sender].totalValidations++;
        validators[msg.sender].successfulValidations++;
        validators[msg.sender].lastValidationTime = block.timestamp;

        emit DataTransferCompleted(transferId, block.timestamp, finalChecksum);
    }

    /**
     * @dev Mark a transfer as failed
     * @param transferId ID of the transfer to mark as failed
     * @param reason Reason for failure
     */
    function failTransfer(
        bytes32 transferId,
        string calldata reason
    ) external onlyValidator transferExists(transferId) nonReentrant {
        DataTransfer storage transfer = transfers[transferId];
        
        require(transfer.status == TransferStatus.Processing, "ISRO: Transfer not in processing state");
        require(bytes(reason).length > 0, "ISRO: Failure reason required");

        transfer.status = TransferStatus.Failed;
        activeTransfers--;

        // Update station statistics
        stations[transfer.fromStation].failedTransfers++;
        stations[transfer.toStation].failedTransfers++;

        // Update validator statistics
        validators[msg.sender].totalValidations++;
        validators[msg.sender].lastValidationTime = block.timestamp;

        emit DataTransferFailed(transferId, reason, block.timestamp);
    }

    /**
     * @dev Cancel a pending transfer
     * @param transferId ID of the transfer to cancel
     */
    function cancelTransfer(bytes32 transferId) external transferExists(transferId) nonReentrant {
        DataTransfer storage transfer = transfers[transferId];
        
        require(transfer.status == TransferStatus.Pending, "ISRO: Transfer not pending");
        require(
            msg.sender == transfer.fromStation || msg.sender == owner(),
            "ISRO: Only sender or owner can cancel"
        );

        transfer.status = TransferStatus.Cancelled;
        activeTransfers--;

        emit DataTransferFailed(transferId, "Cancelled by user", block.timestamp);
    }

    // Station Management

    /**
     * @dev Register a new ISRO station
     * @param stationAddress Address of the station
     * @param stationName Name of the station
     */
    function registerStation(
        address stationAddress,
        string calldata stationName
    ) external onlyOwner {
        require(stationAddress != address(0), "ISRO: Invalid station address");
        require(!isStation[stationAddress], "ISRO: Station already registered");
        require(bytes(stationName).length > 0, "ISRO: Station name required");

        stations[stationAddress] = Station({
            name: stationName,
            isActive: true,
            registrationTime: block.timestamp,
            totalTransfers: 0,
            successfulTransfers: 0,
            failedTransfers: 0
        });

        isStation[stationAddress] = true;

        emit StationRegistered(stationAddress, stationName, block.timestamp);
    }

    /**
     * @dev Update station status
     * @param stationAddress Address of the station
     * @param isActive New active status
     */
    function updateStationStatus(address stationAddress, bool isActive) external onlyOwner {
        require(isStation[stationAddress], "ISRO: Station not registered");
        stations[stationAddress].isActive = isActive;
    }

    // Validator Management

    /**
     * @dev Add a new validator
     * @param validatorAddress Address of the validator
     */
    function addValidator(address validatorAddress) external onlyOwner {
        require(validatorAddress != address(0), "ISRO: Invalid validator address");
        require(!isValidator[validatorAddress], "ISRO: Validator already exists");

        _addValidator(validatorAddress);
    }

    /**
     * @dev Remove a validator
     * @param validatorAddress Address of the validator to remove
     */
    function removeValidator(address validatorAddress) external onlyOwner {
        require(isValidator[validatorAddress], "ISRO: Validator not found");
        require(validatorAddress != owner(), "ISRO: Cannot remove owner as validator");

        isValidator[validatorAddress] = false;
        delete validators[validatorAddress];

        emit ValidatorRemoved(validatorAddress, block.timestamp);
    }

    /**
     * @dev Internal function to add validator
     * @param validatorAddress Address of the validator
     */
    function _addValidator(address validatorAddress) private {
        validators[validatorAddress] = Validator({
            validatorAddress: validatorAddress,
            isActive: true,
            stake: 0,
            lastValidationTime: 0,
            totalValidations: 0,
            successfulValidations: 0
        });

        isValidator[validatorAddress] = true;

        emit ValidatorAdded(validatorAddress, block.timestamp);
    }

    // View Functions

    /**
     * @dev Get transfer details
     * @param transferId ID of the transfer
     * @return Transfer details
     */
    function getTransfer(bytes32 transferId) external view returns (DataTransfer memory) {
        return transfers[transferId];
    }

    /**
     * @dev Get station details
     * @param stationAddress Address of the station
     * @return Station details
     */
    function getStation(address stationAddress) external view returns (Station memory) {
        return stations[stationAddress];
    }

    /**
     * @dev Get validator details
     * @param validatorAddress Address of the validator
     * @return Validator details
     */
    function getValidator(address validatorAddress) external view returns (Validator memory) {
        return validators[validatorAddress];
    }

    /**
     * @dev Get system statistics
     * @return Total transfers, active transfers, total stations, total validators
     */
    function getSystemStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 stationCount,
        uint256 validatorCount
    ) {
        return (totalTransfers, activeTransfers, totalTransfers, totalTransfers);
    }

    // Admin Functions

    /**
     * @dev Update system parameters
     * @param _minimumStake New minimum stake requirement
     * @param _transferTimeout New transfer timeout
     * @param _maxDataSize New maximum data size
     */
    function updateSystemParams(
        uint256 _minimumStake,
        uint256 _transferTimeout,
        uint256 _maxDataSize
    ) external onlyOwner {
        minimumStake = _minimumStake;
        transferTimeout = _transferTimeout;
        maxDataSize = _maxDataSize;
    }

    /**
     * @dev Emergency pause (only owner)
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause
    }

    /**
     * @dev Emergency resume (only owner)
     */
    function emergencyResume() external onlyOwner {
        // Implementation for emergency resume
    }
}
