import { network, run, ethers } from 'hardhat';
import fs from 'fs';
import { MerkleTree } from '../src/utils/merkleHelper';
import whitelist from './whitelist.json';

const totalToBeMinted = 15000;
const TEAM_ADDRESS = '0xfF9A14cB52554F01477E5361fCbE1B9b6BC4Dd9C';
const reserved = 300;
const reservedNFTForWhitelist = 3000;
const BASE_URI =
  'https://boredNFT.mypinata.cloud/ipfs/Qmb3jHp92bNuKwXufmHjJVuKn9iEJBD/';

function printLog(msg: string) {
  console.log(msg);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  if (!deployer.provider) {
    process.exit(1);
  }
  const merkleTree = new MerkleTree(whitelist);

  const merkleRoot = merkleTree.getHexRoot();
  console.log('Computed merkleRoot:', merkleRoot);
  const { chainId } = await deployer.provider.getNetwork();

  console.log('Deploying BoredNFT on network:', network.name);
  console.log('Account address:', address);
  console.log(
    'Account balance:',
    ethers.utils.formatEther(await deployer.provider.getBalance(address)),
  );

  const boredNFTContractFactory = await ethers.getContractFactory('BoredNFT');

  printLog('Deploying BoredNFT...');
  const boredNFTContractImplementation = await boredNFTContractFactory.deploy(
    BASE_URI,
    TEAM_ADDRESS,
    totalToBeMinted,
    reserved,
    reservedNFTForWhitelist,
    merkleRoot,
  );
  await boredNFTContractImplementation.deployed();

  const deploymentInfo = {
    network: network.name,
    'BoredNFT Contract Address': boredNFTContractImplementation.address,
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, undefined, 2),
  );
  const args = [
    BASE_URI,
    TEAM_ADDRESS,
    totalToBeMinted,
    reserved,
    reservedNFTForWhitelist,
    merkleRoot,
  ];
  fs.writeFileSync(
    `argument.js`,
    `module.exports =${JSON.stringify(args, undefined, 2)};`,
  );
  printLog(
    `Latest Contract Address written to: deployments/${network.name}.json
     to verify your contract on etherscan run. 
     $ yarn hardhat verify --network rinkeby --constructor-args argument.js ${boredNFTContractImplementation.address}
     Note that you will need to provide an etherscan API key in your .env    
    `,
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
