import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Errors } from '../../helpers/errors';
import { Errors as ErrorsContract } from '../../typechain';

describe('contracts/utils/Errors.sol', () => {
  it('should match test errors and contract ones', async () => {
    const ErrorsArtifact = await ethers.getContractFactory('Errors');
    const errors = await ErrorsArtifact.deploy();

    const data = await Promise.all(
      Object.keys(Errors)
        .map(
          (key) => errors[key as keyof ErrorsContract] as () => Promise<string>,
        )
        .map((func) => func()),
    );

    Object.values(Errors).forEach((value, index) => {
      expect(data[index]).to.equal(value);
    });
  });
});
