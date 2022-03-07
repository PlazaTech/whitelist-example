import '@nomiclabs/hardhat-waffle';
import * as dotenv from 'dotenv';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-etherscan';
import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-typechain';
import 'solidity-coverage';
import './tasks/index';

dotenv.config();

const { INFURA, MNEMONIC, ETHERSCAN_API_KEY } = process.env;

//if using infura, you can add new networks by adding the name as it is seen in the infura url
const INFURA_NETWORKS = ['mainnet', 'rinkeby'];
const networks = ['mainnet', 'rinkeby'];

const accounts = {
  mnemonic: MNEMONIC,
  path: "m/44'/60'/0'/0",
  initialIndex: 0,
  count: 10,
};

/**
 * Given the name of a network build a Hardhat Network object
 * @param {string} _network - the string name of the network
 * @return {INetwork} - the Hardhat Network object
 */
const makeNetwork = (_network: string): any => {
  if (INFURA_NETWORKS.includes(_network))
    return {
      url: `https://${_network}.infura.io/v3/${INFURA}`,
      gasMultiplier: 2,
      accounts,
    };

  return {};
};

const config: HardhatUserConfig & {
  typechain: { outDir: string; target: string };
} = {
  typechain: {
    outDir: '../src/types',
    target: 'ethers-v5',
  },
  solidity: {
    version: '0.8.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    teamAddress: '0x1483a5ED4Df06c6Bbe85133EeB57289e0b2c6c98',
  },
  networks: networks.reduce((obj: any, entry) => {
    obj[entry] = makeNetwork(entry);
    return obj;
  }, {}),
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts/src',
  },
  mocha: {
    timeout: 100000,
  },
};
export default config;
