//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

library Errors {
    string public constant NOT_OWNER = "1";
    string public constant TX_NOT_EXIST = "2";
    string public constant TX_EXECUTED = "3";
    string public constant TX_CONFIRMED = "4";
    string public constant EMPTY_OWNERS = "5";
    string public constant INVALID_CONFIRMATIONS = "6";
    string public constant ZERO_ADDRESS = "7";
    string public constant ALREADY_OWNER = "8";
    string public constant NOT_ENOUGH_CONFIRMATIONS = "9";
    string public constant TX_FAILED = "10";
    string public constant TX_NOT_CONFIRMED = "11";
}
