//SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../utils/Errors.sol";
import "./interfaces/Game.sol";

contract Game is IGame {
    struct Bid {
        address nft;
        uint256 id;
    }

    uint256 private _numberOfPlayers;
    uint256 private _duration;
    uint256 private _startedAt;
    address private _winner;
    uint256 private _currentMove;
    uint256 private _currentRound;
    mapping(address => Bid) private _nfts;
    mapping(address => mapping(uint256 => bool)) private _moves;

    constructor(uint256 numberOfPlayers, uint256 duration) {
        require(numberOfPlayers > 1, Errors.GAME_INVALID_NUMBER_OF_PLAYERS); // TODO: add error
        require(duration > 0, Errors.GAME_INVALID_DURATION);

        _numberOfPlayers = numberOfPlayers;
        _startedAt = block.timestamp;
        _duration = duration;
    }

    function addNft(IERC721 nft, uint256 nftId) public {
        revert("not implemented");
    }

    function move() public {
        revert("not implemented");
    }

    function withdraw() public {
        revert("not implemented");
    }

    function getData()
        public
        view
        returns (
            uint256 startedAt,
            uint256 duration,
            uint256 numberOfPlayers,
            address winner,
            uint256 currentMove,
            uint256 currentRound
        )
    {
        return (
            _startedAt,
            _duration,
            _numberOfPlayers,
            _winner,
            _currentMove,
            _currentRound
        );
    }

    function getNFT(address player) public view returns (Bid memory) {
        return _nfts[player == address(0) ? msg.sender : player];
    }

    function isPlayerMoved(address player, uint256 round)
        public
        view
        returns (bool)
    {
        address currentPlayer = player == address(0) ? msg.sender : player;
        uint256 currentRound = round == 0 ? _currentRound : round;

        return _moves[currentPlayer][currentRound];
    }
}
