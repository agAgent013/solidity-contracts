//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../utils/Errors.sol";
import "./interfaces/Auction.sol";

// TODO: don't rely on block.timestamp
/**
 * @title Classic auction contract
 * @dev Implements `IAuction` interface
 */
contract ClassicAuction is IAuction, Ownable, ReentrancyGuard {
    /**
     * @dev Start event to track auction start
     */
    event Start(address indexed seller, address indexed nft, uint256 nftId);
    /**
     * @dev Bid event to track user bids
     */
    event Bid(
        address indexed bidder,
        uint256 bid,
        address indexed nft,
        uint256 nftId
    );
    /**
     * @dev Claim event to track the deal and the auction end
     */
    event Claim(
        address indexed owner,
        address indexed highestBidder,
        uint256 highestBid,
        address indexed nft,
        uint256 nftId
    );
    /**
     * @dev Withdraw event to track user withdrawals
     */
    event Withdraw(
        address indexed bidder,
        uint256 amount,
        address indexed nft,
        uint256 nftId
    );

    /**
     * @dev NFT item to sell
     */
    struct NFT {
        IERC721 item;
        uint256 id;
    }

    /**
     * @dev Available auction statuses
     */
    enum Status {
        Created,
        Started,
        Ended
    }

    /**
     * @dev Auction duration
     */
    uint256 private immutable _duration;
    /**
     * @dev Timestamp when auction starts
     */
    uint256 private _startedAt;
    /**
     * @dev Timestamp when auction ends
     */
    uint256 private _endedAt;
    /**
     * @dev Highest bid
     */
    uint256 private _highestBid;
    /**
     * @dev Highest bidder
     */
    address private _highestBidder;

    /**
     * @dev Mapping to track user bids
     */
    mapping(address => uint256) private _bids;
    /**
     * @dev Auction good to sell
     */
    NFT private _nft;
    /**
     * @dev Auction current status
     */
    Status private _status;

    /**
     * @dev Check if the auction is started
     */
    modifier started() {
        require(
            _status == Status.Started,
            _status == Status.Ended
                ? Errors.AUCTION_ENDED
                : Errors.AUCTION_NOT_STARTED
        );
        _;
    }

    /**
     * @dev Check if the auction is not started
     */
    modifier notStarted() {
        require(_status != Status.Started, Errors.AUCTION_STARTED);
        _;
    }

    /**
     * @dev Check if the auction is ended
     */
    modifier ended() {
        // solhint-disable-next-line not-rely-on-time
        require(_endedAt < block.timestamp, Errors.AUCTION_NOT_ENDED);
        _;
    }

    /**
     * @dev Check if the auction is not ended
     */
    modifier notEnded() {
        // solhint-disable-next-line not-rely-on-time
        require(_endedAt >= block.timestamp, Errors.AUCTION_ENDED);
        _;
    }

    /**
     * @dev Initialize contract
     * @param nft NFT address
     * @param id token ID
     * @param startBid minimum start bid for NFT
     * @param auctionDuration auction duration
     */
    constructor(
        address nft,
        uint256 id,
        uint256 startBid,
        uint256 auctionDuration
    ) {
        require(nft != address(0), Errors.ZERO_ADDRESS);
        require(startBid > 0, Errors.AUCTION_ZERO_BID);
        require(auctionDuration > 0, Errors.AUCTION_ZERO_DURATION);

        _duration = auctionDuration;
        _highestBid = startBid;
        _nft = NFT(IERC721(nft), id);
        _status = Status.Created;
    }

    /**
     * @dev Start an auction, set ended at timestamp and transfer NFT to the auction contract address
     */
    function start() public onlyOwner notStarted nonReentrant {
        require(
            _status != Status.Ended || _status == Status.Created,
            Errors.AUCTION_ENDED
        );

        _status = Status.Started;
        // solhint-disable-next-line not-rely-on-time
        _startedAt = block.timestamp;
        _endedAt = _startedAt + _duration;

        _nft.item.transferFrom(msg.sender, address(this), _nft.id);

        emit Start(msg.sender, address(_nft.item), _nft.id);
    }

    /**
     * @dev Make a bid with ETH and set new highest bidder and highest bid
     */
    function bid() public payable started notEnded {
        uint256 newBid = _bids[msg.sender] + msg.value;
        require(newBid > _highestBid, Errors.AUCTION_NOT_ENOUGH_FUNDS_FOR_BID);
        require(_highestBidder != msg.sender, Errors.AUCTION_OWNER_BID);
        require(msg.sender != owner(), Errors.AUCTION_NFT_OWNER);

        _highestBid = newBid;
        _highestBidder = msg.sender;
        _bids[msg.sender] = newBid;

        emit Bid(msg.sender, newBid, address(_nft.item), _nft.id);
    }

    /**
     * @dev Complete the auction with transfering ETH and NFT to new owner and seller.
     * If there are no bids, NFT will be transfered back to the seller.
     */
    function claim() public ended nonReentrant {
        require(
            msg.sender == owner() || msg.sender == _highestBidder,
            Errors.AUCTION_NFT_OWNER
        );

        _status = Status.Ended;

        if (_highestBidder != address(0)) {
            _nft.item.transferFrom(address(this), _highestBidder, _nft.id);
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = owner().call{value: _highestBid}("");
            require(success, Errors.AUCTION_NFT_TRANSFER_FAILED);
        } else {
            _nft.item.transferFrom(address(this), owner(), _nft.id);
        }

        emit Claim(
            owner(),
            _highestBidder,
            _highestBid,
            address(_nft.item),
            _nft.id
        );
    }

    /**
     * @dev Withdraw a bid if it's not a highest one
     */
    function withdraw() public nonReentrant {
        require(
            msg.sender != _highestBidder,
            Errors.AUCTION_USER_HIGHEST_BIDDER
        );
        require(_bids[msg.sender] > 0, Errors.AUCTION_USER_IS_NOT_BIDDER);

        uint256 amount = _bids[msg.sender];
        _bids[msg.sender] = 0;
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, Errors.AUCTION_WITHDRAW_FAILED);

        emit Withdraw(msg.sender, amount, address(_nft.item), _nft.id);
    }

    /**
     * @dev Get current highest bid
     */
    function getHighestBid() public view returns (uint256) {
        return _highestBid;
    }

    /**
     * @dev Get current highest bidder
     */
    function getHighestBidder() public view returns (address) {
        return _highestBidder;
    }

    /**
     * @dev Get timestamp when auction starts
     */
    function startedAt() public view returns (uint256) {
        return _startedAt;
    }

    /**
     * @dev Get timestamp when auction ends
     */
    function endedAt() public view returns (uint256) {
        return _endedAt;
    }

    /**
     * @dev Check if auction is started
     */
    function isStarted() public view returns (bool) {
        return _status == Status.Started;
    }

    /**
     * @dev Check if auction is ended
     */
    function isEnded() public view returns (bool) {
        return _status == Status.Ended;
    }

    /**
     * @dev Get auction duration
     */
    function getDuration() public view returns (uint256) {
        return _duration;
    }

    /**
     * @dev Get auction NFT item
     */
    function getNft() public view returns (NFT memory) {
        return _nft;
    }
}
