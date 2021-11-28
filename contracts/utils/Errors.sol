//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title Errors library
 * @notice Defines the error messages emitted by the different contracts
 * @dev Need to group errors to get rid of duplicates
 */
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

    string public constant AUCTION_NOT_STARTED = "12";
    string public constant AUCTION_NOT_ENDED = "13";
    string public constant AUCTION_STARTED = "14";
    string public constant AUCTION_NOT_ENOUGH_FUNDS_FOR_BID = "15";
    string public constant AUCTION_ENDED = "16";
    string public constant AUCTION_ZERO_BID = "17";
    string public constant AUCTION_ZERO_DURATION = "18";
    string public constant AUCTION_OWNER_BID = "19";
    string public constant AUCTION_NFT_OWNER = "20";
    string public constant AUCTION_NFT_TRANSFER_FAILED = "21";
    string public constant AUCTION_USER_HIGHEST_BIDDER = "22";
    string public constant AUCTION_USER_IS_NOT_BIDDER = "23";
    string public constant AUCTION_WITHDRAW_FAILED = "24";

    string public constant OWNABLE_ERROR = "Ownable: caller is not the owner";
}
