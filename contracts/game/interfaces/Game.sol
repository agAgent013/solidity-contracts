//SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IGame {
    event Added(address indexed owner, address indexed nft, uint256 nftId);
    event Move(address indexed gamer, uint256 move);
    event Claimed(address indexed winner, address[] nfts, uint256[] nftIds);

    function addNft(IERC721 nft, uint256 tokenId) external;

    function move() external;

    function withdraw() external;
}
