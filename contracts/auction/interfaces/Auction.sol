//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title Auction interface
 * @dev Defines an interface for different auctions (Classinc, Blind, Dutch and etc)
 */
interface IAuction {
    /**
     * @dev Start an auction
     */
    function start() external;

    /**
     * @dev Make a bid with ETH
     */
    function bid() external payable;

    /**
     * @dev Claim your purchase and end the auction
     */
    function claim() external;

    /**
     * @dev Withdraw your bid if it's not a highest one
     */
    function withdraw() external;
}
