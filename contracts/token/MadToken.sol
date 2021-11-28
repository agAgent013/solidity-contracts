//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MadToken contract
 * @dev Simple `ERC20` token
 */
contract MadToken is ERC20 {
    /**
     * @dev Initializes the contract by setting a `name` and a `symbol`
     */
    constructor(uint256 initialSupply) ERC20("0xmad token", "MAD") {
        _mint(msg.sender, initialSupply * 10**decimals());
    }
}
