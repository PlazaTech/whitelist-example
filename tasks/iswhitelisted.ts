import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import { BoredNFT } from '../../src/types/BoredNFT';

task('iswhitelisted', 'return true if account is whitelisted  ')
  .addParam('adr', 'boredNFT address', '', types.string)
  .addParam('account', 'account address', '', types.string)
  .addParam(
    'proof',
    'proof for account addresses in json format',
    [],
    types.json,
  )
  .setAction(
    async (
      taskArgs: {
        adr: string;
        account: string;
        proof: string[];
      },
      { ethers },
    ) => {
      const boredNFTAddr = taskArgs.adr;

      console.log(`BoredNFT address: ${boredNFTAddr}`);
      const bored: BoredNFT = (await ethers.getContractAt(
        `BoredNFT`,
        boredNFTAddr,
      )) as unknown as BoredNFT;
      const isWitelist = await bored.isWhitelisted(
        taskArgs.account,
        taskArgs.proof,
      );
      console.log(`account address ${JSON.stringify(taskArgs.account)} ${
        isWitelist ? 'IS whitelisted' : 'IS NOT whitelisted'
      }
      `);
    },
  );
