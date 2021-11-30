import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Errors } from '../../helpers';
import { Game__factory as GameFactory } from '../../typechain';

describe('contracts/game/Game.sol', () => {
  let user: SignerWithAddress;
  let Game: GameFactory;
  const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

  before(async () => {
    [, user] = await ethers.getSigners();
    Game = await ethers.getContractFactory('Game');
  });

  describe('create game', () => {
    it('should create game properly', async () => {
      const game = await Game.deploy(2, ONE_DAY_IN_SECONDS);

      const data = await game.getData();
      expect(data.numberOfPlayers).to.equal(2);
      expect(data.startedAt).to.be.gt(0);
      expect(data.duration).to.equal(ONE_DAY_IN_SECONDS);
      expect(data.winner).to.equal(ethers.constants.AddressZero);
      expect(data.currentMove).to.equal(0);
      expect(data.currentRound).to.equal(0);
    });

    it('should not create game if number of players is zero than two', async () => {
      const promise = Game.deploy(1, ONE_DAY_IN_SECONDS);

      await expect(promise).to.be.revertedWith(
        Errors.GAME_INVALID_NUMBER_OF_PLAYERS,
      );
    });

    it('should not create game if duration is zero', async () => {
      const promise = Game.deploy(2, 0);

      await expect(promise).to.be.revertedWith(Errors.GAME_INVALID_DURATION);
    });
  });

  describe('get NFT', () => {
    it('should return null if there is no NFT for user', async () => {
      const game = await Game.deploy(2, ONE_DAY_IN_SECONDS);

      {
        const { nft, id } = await game.getNFT(ethers.constants.AddressZero);
        expect(nft).to.equal(ethers.constants.AddressZero);
        expect(id).to.equal(0);
      }

      {
        const { nft, id } = await game.getNFT(user.address);
        expect(nft).to.equal(ethers.constants.AddressZero);
        expect(id).to.equal(0);
      }
    });
  });

  describe('is user do a move', () => {
    it('should return false if there is no such user', async () => {
      const game = await Game.deploy(2, ONE_DAY_IN_SECONDS);

      {
        const result = await game.isPlayerMoved(
          ethers.constants.AddressZero,
          0,
        );
        expect(result).to.equal(false);
      }

      {
        const result = await game.isPlayerMoved(user.address, 1);
        expect(result).to.equal(false);
      }
    });
  });
});
