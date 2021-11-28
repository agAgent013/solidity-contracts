//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../utils/Errors.sol";
import "./interfaces/Wallet.sol";

/**
 * @title Multi signature Wallet
 * @dev This is a multi signature wallet with a simple signature schema:
 *
 * - Owners sets required wallets and minimum confirmation number
 * - Only owner can interact with the contract
 * - It's possible to submit, revoke, confirm and execute transaction
- */
contract Wallet is IWallet, ReentrancyGuard {
    /**
     * @dev Deposit event to track receiving ETH
     */
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    /**
     * @dev Submit event to track submits
     */
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    /**
     * @dev Confirm event to track confirms
     */
    event ConfirmTransaction(address indexed owner, uint256 txIndex);
    /**
     * @dev Revoke event to track revokes
     */
    event RevokeTransaction(address indexed owner, uint256 txIndex);
    /**
     * @dev Execute event to track executions
     */
    event ExecuteTransaction(address indexed owner, uint256 txIndex);

    /**
     * @dev Transaction type to store and read
     */
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numberOfConfirmations;
    }

    /**
     * @dev List of wallet owners
     */
    address[] public owners;
    /**
     * @dev Number of required confirmations
     */
    uint256 public requiredConfirmations;
    /**
     * @dev Transactions list which were submited to the contract
     */
    Transaction[] public transactions;
    /**
     * @dev Mapping to track if sender is an owner
     */
    mapping(address => bool) public isOwner;
    /**
     * @dev Mapping to track if transaction is confirmed by an owner
     */
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    /**
     * @dev Checks if sender is an owner
     */
    modifier onlyOwner() {
        require(isOwner[msg.sender], Errors.NOT_OWNER);
        _;
    }

    /**
     * @dev Checks if transaction exists
     */
    modifier isTxExists(uint256 index) {
        require(index < transactions.length, Errors.TX_NOT_EXIST);
        _;
    }

    /**
     * @dev Checks if transaction is not executed
     */
    modifier notExecuted(uint256 index) {
        require(!transactions[index].executed, Errors.TX_EXECUTED);
        _;
    }

    /**
     * @dev Checks if transaction is already confirmed by an owner
     */
    modifier isConfirmedByOwner(uint256 index) {
        require(isConfirmed[index][msg.sender], Errors.TX_NOT_CONFIRMED);
        _;
    }

    /**
     * @dev Checks if transaction is not confirmed by an owner
     */
    modifier notConfirmedByOwner(uint256 index) {
        require(!isConfirmed[index][msg.sender], Errors.TX_CONFIRMED);
        _;
    }

    /**
     * @dev Checks if transaction has enough confirmations to execute it
     */
    modifier isEnoughConfirmations(uint256 index) {
        require(
            transactions[index].numberOfConfirmations >= requiredConfirmations,
            Errors.NOT_ENOUGH_CONFIRMATIONS
        );
        _;
    }

    /**
     * @dev Initialize contract with owner addresses and minimum number of confirmations.
     * It can throw an error if owner address is `AddressZero` or if number of confirmations if greater than owners length.
     */
    constructor(address[] memory addresses, uint256 confirmations) {
        require(addresses.length > 0, Errors.EMPTY_OWNERS);
        require(
            confirmations > 0 && confirmations <= addresses.length,
            Errors.INVALID_CONFIRMATIONS
        );

        requiredConfirmations = confirmations;

        for (uint256 index = 0; index < addresses.length; index += 1) {
            address owner = addresses[index];

            require(owner != address(0), Errors.ZERO_ADDRESS);
            require(!isOwner[owner], Errors.ALREADY_OWNER);

            isOwner[owner] = true;
            owners.push(owner);
        }
    }

    /**
     * @dev Receive ETH to the contract balance
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Get transaction by index if exists
     * @param index transaction index
     */
    function getTransaction(uint256 index)
        public
        view
        isTxExists(index)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numberOfConfirmations
        )
    {
        Transaction memory transaction = transactions[index];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numberOfConfirmations
        );
    }

    /**
     * @dev Submit transaction
     * @param to receiver address
     * @param value amount to send
     * @param data binary data to send
     * @param withConfirmation shows if owner can confirm initiated transaction
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data,
        bool withConfirmation
    ) public onlyOwner {
        uint256 index = transactions.length;

        transactions.push(
            Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                numberOfConfirmations: withConfirmation ? 1 : 0
            })
        );

        emit SubmitTransaction(msg.sender, index, to, value, data);

        if (withConfirmation) {
            _confirmOwner(index);
        }
    }

    /**
     * @dev Confirm transaction and increase number of confirmations
     * @param index transaction index
     */
    function confirmTransaction(uint256 index)
        public
        onlyOwner
        isTxExists(index)
        notExecuted(index)
        notConfirmedByOwner(index)
    {
        Transaction storage transaction = transactions[index];
        transaction.numberOfConfirmations += 1;

        _confirmOwner(index);
    }

    /**
     * @dev Execute transaction with proper number of confirmations and status
     * @param index transaction index
     */
    function executeTransaction(uint256 index)
        public
        onlyOwner
        isTxExists(index)
        notExecuted(index)
        isEnoughConfirmations(index)
        nonReentrant
    {
        _execureTx(index);
    }

    /**
     * @dev Revoke transaction and decrese number of confirmations
     * @param index transaction index
     */
    function revokeTransaction(uint256 index)
        public
        onlyOwner
        isTxExists(index)
        notExecuted(index)
        isConfirmedByOwner(index)
    {
        Transaction storage transaction = transactions[index];
        transaction.numberOfConfirmations -= 1;
        isConfirmed[index][msg.sender] = false;

        emit RevokeTransaction(msg.sender, index);
    }

    /**
     * @dev Sets sender as already confirmed owner
     * @param index transaction index
     */
    function _confirmOwner(uint256 index) private {
        isConfirmed[index][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, index);
    }

    /**
     * @dev Executes transaction and checks if execution was successful
     * @param index transaction index
     */
    function _execureTx(uint256 index) private {
        Transaction storage transaction = transactions[index];
        transaction.executed = true;

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );

        require(success, Errors.TX_FAILED);

        emit ExecuteTransaction(msg.sender, index);
    }
}
