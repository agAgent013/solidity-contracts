//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../utils/Errors.sol";
import "./interfaces/Wallet.sol";

contract Wallet is IWallet, ReentrancyGuard {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 txIndex);
    event RevokeTransaction(address indexed owner, uint256 txIndex);
    event ExecuteTransaction(address indexed owner, uint256 txIndex);

    address[] public owners;
    uint256 public requiredConfirmations;
    Transaction[] public transactions;
    mapping(address => bool) public isOwner;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numberOfConfirmations;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], Errors.NOT_OWNER);
        _;
    }

    modifier isTxExists(uint256 index) {
        require(index < transactions.length, Errors.TX_NOT_EXIST);
        _;
    }

    modifier notExecuted(uint256 index) {
        require(!transactions[index].executed, Errors.TX_EXECUTED);
        _;
    }

    modifier isConfirmedByOwner(uint256 index) {
        require(isConfirmed[index][msg.sender], Errors.TX_NOT_CONFIRMED);
        _;
    }

    modifier notConfirmedByOwner(uint256 index) {
        require(!isConfirmed[index][msg.sender], Errors.TX_CONFIRMED);
        _;
    }

    modifier isEnoughConfirmations(uint256 index) {
        require(
            transactions[index].numberOfConfirmations >= requiredConfirmations,
            Errors.NOT_ENOUGH_CONFIRMATIONS
        );
        _;
    }

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

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

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

    function _confirmOwner(uint256 index) private {
        isConfirmed[index][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, index);
    }

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
