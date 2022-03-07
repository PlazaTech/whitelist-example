import { network, run, ethers } from 'hardhat';
import fs from 'fs';
import { MerkleTree } from '../src/utils/merkleHelper';

import whitelist from './whitelist.json';

async function main() {
  const merkleTree = new MerkleTree(whitelist);
  const merkleRoot = merkleTree.getHexRoot();
  let res: any = {};
  whitelist.forEach(element => {
    res[element] = merkleTree.getHexProof(element);
  });
  res.merkleRoot = merkleRoot;
  fs.writeFileSync(
    `merkleProofs/wl_merkleTreeProof.json`,
    JSON.stringify(res, undefined, 2),
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
