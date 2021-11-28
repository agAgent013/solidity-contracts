//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../utils/Errors.sol";

/**
 * @title CollectionItem contract
 * @dev CollectionItem is a `ERC721` compatible token for trading and collecting
 */
contract CollectionItem is Ownable, ERC721URIStorage {
    using Counters for Counters.Counter;

    /**
     * @dev IDs to track minted tokens
     */
    Counters.Counter private _tokenIds;

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol`
     */
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("Collection Item", "COL") {}

    /**
     * @dev Award item to a receiver address with JSON payload
     * @param receiver receiver address who gets an NFT
     * @param tokenURI endpoint which returns JSON data for token
     * @return token ID
     */
    function awardItem(address receiver, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        require(receiver != address(0), Errors.ZERO_ADDRESS);

        uint256 tokenId = _tokenIds.current();
        _safeMint(receiver, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }
}
