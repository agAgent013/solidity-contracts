import { ContractTransaction, ContractReceipt } from 'ethers';
import { ethers } from 'hardhat';

export const waitForTx = async (
  contractTx: Promise<ContractTransaction>,
  confirmations = 1,
): Promise<ContractReceipt> => contractTx.then((tx) => tx.wait(confirmations));

export const waitForAll = async (
  contractTxs: Promise<ContractTransaction>[],
  confirmations = 1,
): Promise<ContractReceipt[]> => {
  const promises = contractTxs.map((contractTx) =>
    waitForTx(contractTx, confirmations),
  );

  return Promise.all(promises);
};

export const increaseTime = async (
  secondsToIncrease: number,
): Promise<void> => {
  await ethers.provider.send('evm_increaseTime', [secondsToIncrease]);
  await ethers.provider.send('evm_mine', []);
};

export const takeSnapshot = async (): Promise<string> =>
  ethers.provider.send('evm_snapshot', []);

export const revertSnapshot = async (id: string): Promise<void> => {
  const revertId = await ethers.provider.send('evm_revert', [id]);

  if (!revertId) {
    throw Error('failed to restore snapshot');
  }
};
