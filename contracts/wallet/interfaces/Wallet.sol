//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IWallet {
    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data,
        bool withConfirmation
    ) external;

    function confirmTransaction(uint256 index) external;

    function executeTransaction(uint256 index) external;

    function revokeTransaction(uint256 index) external;
}
