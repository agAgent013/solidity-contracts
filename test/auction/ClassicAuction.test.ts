import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { BigNumberish } from 'ethers';
import { expect } from 'chai';

import { Errors, increaseTime, waitForTx } from '../../helpers';
import {
  ClassicAuction,
  ClassicAuction__factory as ClassicAuctionFactory,
  CollectionItem,
  CollectionItem__factory as CollectionItemFactory,
} from '../../typechain';

describe('contracts/auction/ClassicAuction.sol', () => {
  let ClassicAuctionArtifact: ClassicAuctionFactory;
  let CollectionItemArtifact: CollectionItemFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

  const awardCollectionItem = async (
    user: SignerWithAddress,
  ): Promise<{ id: BigNumberish; collectionItem: CollectionItem }> => {
    const collectionItem = await CollectionItemArtifact.deploy();

    const id = await collectionItem.callStatic.awardItem(user.address, '');
    await collectionItem.awardItem(user.address, '');

    return { id, collectionItem };
  };

  const createNewAuction = async (
    withApprove = true,
  ): Promise<ClassicAuction> => {
    const { id, collectionItem } = await awardCollectionItem(owner);
    const auction = await ClassicAuctionArtifact.connect(owner).deploy(
      collectionItem.address,
      id,
      ethers.utils.parseUnits('1', 'ether'),
      ONE_DAY_IN_SECONDS,
    );

    if (withApprove) {
      await collectionItem.approve(auction.address, id);
    }

    return auction;
  };

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    [ClassicAuctionArtifact, CollectionItemArtifact] = await Promise.all([
      ethers.getContractFactory('ClassicAuction'),
      ethers.getContractFactory('CollectionItem'),
    ]);
  });

  describe('create auction', () => {
    it('should create classic auction', async () => {
      const auction = await createNewAuction();

      const [
        startedAt,
        endedAt,
        duration,
        isStarted,
        isEnded,
        highestBid,
        highestBidder,
      ] = await Promise.all([
        auction.startedAt(),
        auction.endedAt(),
        auction.getDuration(),
        auction.isStarted(),
        auction.isEnded(),
        auction.getHighestBid(),
        auction.getHighestBidder(),
      ]);

      expect(startedAt).to.equal(0);
      expect(endedAt).to.equal(0);
      expect(duration).to.equal(ONE_DAY_IN_SECONDS);
      expect(isStarted).to.equal(false);
      expect(isEnded).to.equal(false);
      expect(highestBid).to.equal(ethers.utils.parseUnits('1', 'ether'));
      expect(highestBidder).to.equal(ethers.constants.AddressZero);
    });

    it('should not create classic auction with zero nft', async () => {
      const promise = ClassicAuctionArtifact.deploy(
        ethers.constants.AddressZero,
        0,
        ethers.utils.parseUnits('1', 'ether'),
        ONE_DAY_IN_SECONDS,
      );

      await expect(promise).to.be.revertedWith(Errors.ZERO_ADDRESS);
    });

    it('should not create classic auction with zero bid', async () => {
      const promise = ClassicAuctionArtifact.deploy(owner.address, 0, 0, 0);

      await expect(promise).to.be.revertedWith(Errors.AUCTION_ZERO_BID);
    });

    it('should not create classic auction with zero duration', async () => {
      const promise = ClassicAuctionArtifact.deploy(
        owner.address,
        0,
        ethers.utils.parseUnits('1', 'ether'),
        0,
      );

      await expect(promise).to.be.revertedWith(Errors.AUCTION_ZERO_DURATION);
    });
  });

  describe('start auction', () => {
    it('should start auction properly', async () => {
      const auction = await createNewAuction();

      await waitForTx(auction.start());

      const [startedAt, endedAt] = await Promise.all([
        auction.startedAt(),
        auction.endedAt(),
      ]);
      expect(startedAt).to.be.gt(0);
      expect(endedAt).to.be.gt(startedAt);
    });

    it('should not start auction if it is already started', async () => {
      const auction = await createNewAuction();

      await waitForTx(auction.start());

      await expect(auction.start()).to.be.revertedWith(Errors.AUCTION_STARTED);
    });

    it('should not start auction if user is not an owner', async () => {
      const auction = await createNewAuction();

      await expect(auction.connect(user1).start()).to.be.revertedWith(
        Errors.OWNABLE_ERROR,
      );
    });

    it('should not start auction if it is ended', async () => {
      const auction = await createNewAuction();

      await waitForTx(auction.start());
      await increaseTime(ONE_DAY_IN_SECONDS + 1);
      await waitForTx(auction.claim());

      await expect(auction.start()).to.be.revertedWith(Errors.AUCTION_ENDED);
    });
  });

  describe('make a bid', () => {
    it('should make a bid properly', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await waitForTx(
        auction
          .connect(user1)
          .bid({ value: ethers.utils.parseUnits('1.1', 'ether') }),
      );
      await waitForTx(
        auction
          .connect(user2)
          .bid({ value: ethers.utils.parseUnits('1.2', 'ether') }),
      );
      await waitForTx(
        auction
          .connect(user1)
          .bid({ value: ethers.utils.parseUnits('0.2', 'ether') }),
      );

      const [highestBid, highestBidder] = await Promise.all([
        auction.getHighestBid(),
        auction.getHighestBidder(),
      ]);
      expect(highestBid).to.equal(ethers.utils.parseUnits('1.3', 'ether'));
      expect(highestBidder).to.equal(user1.address);
    });

    it('should not make a bid if auction is not started', async () => {
      const auction = await createNewAuction();

      const promise = auction
        .connect(user1)
        .bid({ value: ethers.utils.parseUnits('1.1', 'ether') });

      await expect(promise).to.be.revertedWith(Errors.AUCTION_NOT_STARTED);
    });

    it('should not make a bid if auction is ended', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());
      await increaseTime(ONE_DAY_IN_SECONDS + 1);

      const promise = auction
        .connect(user1)
        .bid({ value: ethers.utils.parseUnits('1.1', 'ether') });

      await expect(promise).to.be.revertedWith(Errors.AUCTION_ENDED);
    });

    it('should not make a bid if auction is ended and nft has been claimed', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());
      await increaseTime(ONE_DAY_IN_SECONDS + 1);
      await waitForTx(auction.claim());

      const promise = auction
        .connect(user1)
        .bid({ value: ethers.utils.parseUnits('1.1', 'ether') });

      await expect(promise).to.be.revertedWith(Errors.AUCTION_ENDED);
    });

    it('should not make a bid if user is highest bidder', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await waitForTx(
        auction
          .connect(user1)
          .bid({ value: ethers.utils.parseUnits('1.1', 'ether') }),
      );

      const promise = auction
        .connect(user1)
        .bid({ value: ethers.utils.parseUnits('1.2', 'ether') });

      await expect(promise).to.be.revertedWith(Errors.AUCTION_OWNER_BID);
    });

    it('should not make a bid if user is an nft owner', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      const promise = auction
        .connect(owner)
        .bid({ value: ethers.utils.parseUnits('1.1', 'ether') });

      await expect(promise).to.be.revertedWith(Errors.AUCTION_NFT_OWNER);
    });

    it('should not make a bid with low amount', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      const promise = auction
        .connect(owner)
        .bid({ value: ethers.utils.parseUnits('0.1', 'ether') });

      await expect(promise).to.be.revertedWith(
        Errors.AUCTION_NOT_ENOUGH_FUNDS_FOR_BID,
      );
    });
  });

  describe('claim nft', () => {
    it('should claim nft and end auction', async () => {
      const auction = await createNewAuction();
      const ownerBalance = await owner.getBalance();
      const bid = ethers.utils.parseUnits('1.1', 'ether');
      await waitForTx(auction.start());

      await waitForTx(auction.connect(user1).bid({ value: bid }));
      await increaseTime(ONE_DAY_IN_SECONDS + 1);
      await waitForTx(auction.connect(user1).claim());

      const nft = await auction.getNft();
      const collectionItem = CollectionItemFactory.connect(nft.item, user1);
      expect(await owner.getBalance()).to.gt(ownerBalance);
      expect(await collectionItem.ownerOf(nft.id)).to.equal(user1.address);
    });

    it('should claim to owner if there are no bids', async () => {
      const auction = await createNewAuction();
      const ownerBalance = await owner.getBalance();
      await waitForTx(auction.start());

      await increaseTime(ONE_DAY_IN_SECONDS + 1);
      await waitForTx(auction.claim());

      const nft = await auction.getNft();
      const collectionItem = CollectionItemFactory.connect(nft.item, owner);
      expect(await owner.getBalance()).to.lte(ownerBalance);
      expect(await collectionItem.ownerOf(nft.id)).to.equal(owner.address);
    });

    it('should not claim if auction is in progress', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await expect(auction.claim()).to.be.revertedWith(
        Errors.AUCTION_NOT_ENDED,
      );
    });

    it('should not claim if user is not the owner or the highest bidder', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await increaseTime(ONE_DAY_IN_SECONDS + 1);
      await expect(auction.connect(user2).claim()).to.be.revertedWith(
        Errors.AUCTION_NFT_OWNER,
      );
    });
  });

  describe('withdraw bids', () => {
    it('should withdraw bid properly', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await waitForTx(
        auction
          .connect(user1)
          .bid({ value: ethers.utils.parseUnits('1.1', 'ether') }),
      );
      await waitForTx(
        auction
          .connect(user2)
          .bid({ value: ethers.utils.parseUnits('1.2', 'ether') }),
      );

      const userBalance = await user1.getBalance();
      await waitForTx(auction.connect(user1).withdraw());

      expect(await user1.getBalance()).to.be.gte(userBalance);
    });

    it('should not withdraw if user is the highest bidder', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      await waitForTx(
        auction
          .connect(user1)
          .bid({ value: ethers.utils.parseUnits('1.1', 'ether') }),
      );

      const promise = waitForTx(auction.connect(user1).withdraw());
      await expect(promise).to.be.revertedWith(
        Errors.AUCTION_USER_HIGHEST_BIDDER,
      );
    });

    it('should not withdraw if user has no bids', async () => {
      const auction = await createNewAuction();
      await waitForTx(auction.start());

      const promise = waitForTx(auction.connect(user1).withdraw());
      await expect(promise).to.be.revertedWith(
        Errors.AUCTION_USER_IS_NOT_BIDDER,
      );
    });
  });
});
