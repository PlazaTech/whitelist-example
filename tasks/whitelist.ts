import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import { BoredNFT } from '../../src/types/BoredNFT';

task('whitelist', 'whitelist an address')
  .addParam('adr', 'boredNFT address', '', types.string)
  .addParam('merkleroot', 'account addresses in json format', '', types.string)
  .addParam('amount', 'amount of NFT to mint and send', 0, types.int)
  .setAction(
    async (
      taskArgs: {
        adr: string;
        merkleroot: string;
        amount: number;
      },
      { ethers },
    ) => {
      const boredNFTAddr = taskArgs.adr;

      console.log(`BoredNFT address: ${boredNFTAddr}`);
      const bored: BoredNFT = (await ethers.getContractAt(
        `BoredNFT`,
        boredNFTAddr,
      )) as unknown as BoredNFT;

      console.log(`will whitelist merkleRoot:
                    ${JSON.stringify(taskArgs.merkleroot)} for ${
        taskArgs.amount
      } reserved NFT
      `);
      const receipt = await (
        await bored.setPresalesParam(taskArgs.merkleroot, taskArgs.amount)
      ).wait(1);

      console.log(
        'Initialization:',
        (receipt as { status: number }).status === 1 ? 'ok' : 'error',
        'hash:',
        receipt.transactionHash,
      );
    },
  );
