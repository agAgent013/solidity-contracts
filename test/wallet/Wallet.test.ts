import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { Errors } from '../../helpers/errors';
import { Wallet__factory as WalletFactory } from '../../typechain';

describe('contracts/wallet/Wallet.sol', () => {
  const OneEther = BigNumber.from(10).pow(18);
  let signer1: SignerWithAddress;
  let signer2: SignerWithAddress;
  let Wallet: WalletFactory;

  before(async () => {
    Wallet = await ethers.getContractFactory('Wallet');
    [signer1, signer2] = await ethers.getSigners();
  });

  describe('creation', () => {
    it('should return the new wallet', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      expect(await wallet.owners(0)).to.equal(signer1.address);
      expect(await wallet.owners(1)).to.equal(signer2.address);
      expect(await wallet.requiredConfirmations()).to.equal(owners.length);
    });

    it('should not create wallet with empty owners', async () => {
      await expect(Wallet.deploy([], 0)).to.be.revertedWith(
        Errors.EMPTY_OWNERS,
      );
    });

    it('should not create wallet with wrong required confirmations', async () => {
      const owners = [signer1.address, signer2.address];

      await expect(Wallet.deploy(owners, owners.length + 1)).to.be.revertedWith(
        Errors.INVALID_CONFIRMATIONS,
      );
    });

    it('should not create wallet with zero addresses', async () => {
      const owners = [ethers.constants.AddressZero];

      await expect(Wallet.deploy(owners, owners.length)).to.be.revertedWith(
        Errors.ZERO_ADDRESS,
      );
    });

    it('should not create wallet with the same owners', async () => {
      const owners = [signer1.address, signer1.address];

      await expect(Wallet.deploy(owners, owners.length)).to.be.revertedWith(
        Errors.ALREADY_OWNER,
      );
    });
  });

  describe('submit transaction', () => {
    it('should submit new transaction', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const tx = await wallet.submitTransaction(
        signer2.address,
        OneEther,
        '0x',
        false,
      );
      await tx.wait();

      const txData = await wallet.getTransaction(0);
      expect(txData.to).to.equal(signer2.address);
      expect(txData.value).to.equal(OneEther);
      expect(txData.data).to.equal('0x');
      expect(txData.executed).to.equal(false);
      expect(txData.numberOfConfirmations).to.equal(0);
    });

    it('should submit new transaction and confirm', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const tx = await wallet.submitTransaction(
        signer2.address,
        OneEther,
        '0x',
        true,
      );
      await tx.wait();

      const txData = await wallet.getTransaction(0);
      expect(txData.to).to.equal(signer2.address);
      expect(txData.value).to.equal(OneEther);
      expect(txData.data).to.equal('0x');
      expect(txData.executed).to.equal(false);
      expect(txData.numberOfConfirmations).to.equal(1);
    });

    it('should not submit new transaction if signer is not an owner', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet
        .connect(signer2)
        .submitTransaction(signer2.address, OneEther, '0x', true);

      await expect(result).to.be.revertedWith(Errors.NOT_OWNER);
    });
  });

  describe('confirm transaction', () => {
    it('should confirm transaction', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      {
        const tx = await wallet.submitTransaction(
          signer2.address,
          OneEther,
          '0x',
          false,
        );
        await tx.wait();

        const txData = await wallet.getTransaction(0);
        expect(txData.numberOfConfirmations).to.equal(0);
      }

      {
        const tx = await wallet.confirmTransaction(0);
        await tx.wait();

        const txData = await wallet.getTransaction(0);
        expect(txData.numberOfConfirmations).to.equal(1);
      }

      {
        const tx = await wallet.connect(signer2).confirmTransaction(0);
        await tx.wait();

        const txData = await wallet.getTransaction(0);
        expect(txData.numberOfConfirmations).to.equal(2);
      }
    });

    it('should not confirm unknown transaction', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.confirmTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_NOT_EXIST);
    });

    it('should not confirm transaction if it is called from unknown signer', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.connect(signer2).confirmTransaction(0);
      await expect(result).to.be.revertedWith(Errors.NOT_OWNER);
    });

    it('should not double confirm transaction', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      {
        const tx = await wallet.submitTransaction(
          signer2.address,
          OneEther,
          '0x',
          false,
        );
        await tx.wait();
      }

      {
        const tx = await wallet.confirmTransaction(0);
        await tx.wait();
      }

      const result = wallet.confirmTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_CONFIRMED);
    });

    it('should not confirm if transaction is already executed', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer1.address, 0, [], true)
        .then((tx) => tx.wait());

      await wallet.executeTransaction(0).then((tx) => tx.wait());

      const result = wallet.confirmTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_EXECUTED);
    });
  });

  describe('revoke transaction', () => {
    it('should revoke transaction', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer1.address, 0, [], true)
        .then((tx) => tx.wait());

      const tx = await wallet.revokeTransaction(0);
      await tx.wait();

      const txData = await wallet.getTransaction(0);
      expect(txData.numberOfConfirmations).to.equal(0);
    });

    it('should not revoke transaction if it is not confirmed', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer1.address, 0, [], false)
        .then((tx) => tx.wait());

      const result = wallet.revokeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_NOT_CONFIRMED);
    });

    it('should not revoke unknown transaction', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.revokeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_NOT_EXIST);
    });

    it('should not revoke transaction from unknown signer', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.connect(signer2).revokeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.NOT_OWNER);
    });

    it('should not revoke transaction if it is executed', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer1.address, 0, [], true)
        .then((tx) => tx.wait());

      await wallet.executeTransaction(0).then((tx) => tx.wait());

      const result = wallet.revokeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_EXECUTED);
    });
  });

  describe('execute transaction', () => {
    it('should execute transaction', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer2.address, 0, [], true)
        .then((tx) => tx.wait());

      await wallet
        .connect(signer2)
        .confirmTransaction(0)
        .then((tx) => tx.wait());

      await wallet.executeTransaction(0).then((tx) => tx.wait());

      const txData = await wallet.getTransaction(0);
      expect(txData.executed).to.equal(true);
    });

    it('should not execute transaction with unknown signer', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.connect(signer2).executeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.NOT_OWNER);
    });

    it('should not execute unknown transaction', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const result = wallet.executeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_NOT_EXIST);
    });

    it('should not execute transaction if there is no enough confirmations', async () => {
      const owners = [signer1.address, signer2.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer2.address, 0, [], true)
        .then((tx) => tx.wait());

      const result = wallet.executeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.NOT_ENOUGH_CONFIRMATIONS);
    });

    it('should not execute transaction if it is already executed', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer2.address, 0, [], true)
        .then((tx) => tx.wait());

      await wallet.executeTransaction(0).then((tx) => tx.wait());

      const result = wallet.executeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_EXECUTED);
    });

    it('should not execute failed transaction', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      await wallet
        .submitTransaction(signer2.address, OneEther, [], true)
        .then((tx) => tx.wait());

      const result = wallet.executeTransaction(0);
      await expect(result).to.be.revertedWith(Errors.TX_FAILED);

      const txData = await wallet.getTransaction(0);
      expect(txData.executed).to.equal(false);
    });
  });

  describe('receive', () => {
    it('should receive ether', async () => {
      const owners = [signer1.address];
      const wallet = await Wallet.deploy(owners, owners.length);

      const tx = await signer1.sendTransaction({
        to: wallet.address,
        from: signer1.address,
        value: ethers.utils.parseUnits('1', 'ether').toHexString(),
      });
      await tx.wait();

      expect(await ethers.provider.getBalance(wallet.address)).to.equal(
        OneEther,
      );
    });
  });
});
