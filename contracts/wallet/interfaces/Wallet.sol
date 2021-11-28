//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title Wallet interface
 * @dev Defines an interface for different wallets (Multisig, SimpleWallet and etc)
 */
interface IWallet {
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
    ) external;

    /**
     * @dev Confirm transaction
     * @param index transaction index
     */
    function confirmTransaction(uint256 index) external;

    /**
     * @dev Execute transaction
     * @param index transaction index
     */
    function executeTransaction(uint256 index) external;

    /**
     * @dev Revoke transaction
     * @param index transaction index
     */
    function revokeTransaction(uint256 index) external;
}
