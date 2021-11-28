import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

import { Errors, waitForTx } from '../../helpers';
import { CollectionItem__factory as CollectionItemFactory } from '../../typechain';

describe('contracts/collection/CollectionItem.sol', () => {
  let user: SignerWithAddress;
  let CollectionItem: CollectionItemFactory;

  before(async () => {
    [, user] = await ethers.getSigners();
    CollectionItem = await ethers.getContractFactory('CollectionItem');
  });

  it('should create collection item properly', async () => {
    const collectionItem = await CollectionItem.deploy();

    expect(await collectionItem.name()).to.equal('Collection Item');
    expect(await collectionItem.symbol()).to.equal('COL');
  });

  it('should not award collection item to zero address', async () => {
    const collectionItem = await CollectionItem.deploy();

    const result = collectionItem.awardItem(ethers.constants.AddressZero, '');
    await expect(result).to.be.revertedWith(Errors.ZERO_ADDRESS);
  });

  it('should award collection item properly', async () => {
    const collectionItem = await CollectionItem.deploy();

    const id = await collectionItem.callStatic.awardItem(user.address, '');
    await waitForTx(collectionItem.awardItem(user.address, ''));

    expect(await collectionItem.ownerOf(id)).to.equal(user.address);
  });
});
