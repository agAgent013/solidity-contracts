import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { expect } from 'chai';

import { MadToken__factory as MadTokenFactory } from '../../typechain';

describe('contracts/token/MadToken.sol', () => {
  let MadToken: MadTokenFactory;

  before(async () => {
    MadToken = await ethers.getContractFactory('MadToken');
  });

  it('should create MadToken with initial supply', async () => {
    const initialSupply = 100_000_000;
    const madToken = await MadToken.deploy(initialSupply);

    const decimals = await madToken.decimals();
    expect(decimals).to.equal(18);
    expect(await madToken.totalSupply()).to.equal(
      BigNumber.from(initialSupply).mul(BigNumber.from(10).pow(decimals)),
    );
  });
});
