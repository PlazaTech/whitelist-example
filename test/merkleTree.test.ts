import { ethers, getNamedAccounts } from 'hardhat';
import { expect } from 'chai';
import { BoredNFT } from '../../src/types/BoredNFT';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deploy } from './utils/ethersHelpers';
import { BigNumber } from '@ethersproject/bignumber';
import { MerkleTree } from '../src/utils/merkleHelper';
describe('merkle tree', () => {
  const whitelistAddresses = [
    '0xd1629474d25a63B1018FcC965e1d218A00F6CbD3',
    '0xB7D182271E67b43DdE93CC7966a52CA456C59C53',
    '0x3DFaCd79E9A4dE85B1b8Fb16A0C62dC6971424Fd',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
    '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
    '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
    '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
    '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
    '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
    '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    '0x1f6a3B3b5821FE12403424635DC2DE506ef6D477',
    '0x82C7E6132878DF648b626f4f7D2CE1312f16A819',
  ];
  let signers: SignerWithAddress[];
  let boredNFT: BoredNFT;
  let mintFee: BigNumber;
  let merkleTree: MerkleTree;
  let merkleRoot: string;
  const totalToBeMinted = 50;
  beforeEach(async () => {
    signers = await ethers.getSigners();
    whitelistAddresses.push(signers[3].address);
    const elements = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
    ];
    merkleTree = new MerkleTree(elements);

    merkleRoot = merkleTree.getHexRoot();

    const proof = merkleTree.getHexProof(elements[0]);

    boredNFT = await deploy<BoredNFT>(
      'BoredNFT',
      undefined,
      'https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/',
      '0xe7b3d473411dd530D7889805e148b738F2236E6d',
      totalToBeMinted,
      150,
      2000,
      merkleRoot,
    );
    await boredNFT.pause(false);
    mintFee = await boredNFT._price();

    // mint uad for whale
  });
  it('should return true for a valid leaf', async function () {
    const elements = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
    ];
    const proof = merkleTree.getHexProof(elements[0]);

    expect(
      await boredNFT
        .connect(signers[0])
        .isWhitelisted(signers[0].address, proof),
    ).to.equal(true);
  });

  it('should return false for an invalid leaf', async function () {
    const elements = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
    ];
    const proof = merkleTree.getHexProof(elements[0]);
    expect(
      await boredNFT
        .connect(signers[4])
        .isWhitelisted(signers[4].address, proof),
    ).to.equal(false);
  });

  it('should return false for incorrect proof', async function () {
    const elements = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
    ];
    const proof = merkleTree.getHexProof(elements[1]);
    expect(
      await boredNFT
        .connect(signers[0])
        .isWhitelisted(signers[0].address, proof),
    ).to.equal(false);
  });

  describe('whitelist', () => {
    const whitelistAddresses = [
      '0xd1629474d25a63B1018FcC965e1d218A00F6CbD3',
      '0xB7D182271E67b43DdE93CC7966a52CA456C59C53',
      '0x3DFaCd79E9A4dE85B1b8Fb16A0C62dC6971424Fd',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
      '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
      '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
      '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
      '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
      '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
      '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
      '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
      '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
      '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      '0x1f6a3B3b5821FE12403424635DC2DE506ef6D477',
      '0x82C7E6132878DF648b626f4f7D2CE1312f16A819',
    ];
    let signers: SignerWithAddress[];
    let boredNFT: BoredNFT;
    let mintFee: BigNumber;
    let merkleTree: MerkleTree;
    let merkleRoot: string;
    before(async () => {
      signers = await ethers.getSigners();
      whitelistAddresses.push(signers[3].address);

      merkleTree = new MerkleTree(whitelistAddresses);

      merkleRoot = merkleTree.getHexRoot();

      boredNFT = await deploy<BoredNFT>(
        'BoredNFT',
        undefined,
        'https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/',
        '0xe7b3d473411dd530D7889805e148b738F2236E6d',
        totalToBeMinted,
        150,
        2000,
        merkleRoot,
      );
      await boredNFT.pause(false);
      mintFee = await boredNFT._price();
    });
    it('should return true for a valid leaf', async function () {
      const proof = merkleTree.getHexProof(
        whitelistAddresses[whitelistAddresses.length - 1],
      );

      expect(
        await boredNFT
          .connect(signers[3])
          .isWhitelisted(signers[3].address, proof),
      ).to.equal(true);
    });

    it('should return false for an invalid leaf', async function () {
      const proof = merkleTree.getHexProof(whitelistAddresses[0]);
      expect(
        await boredNFT
          .connect(signers[3])
          .isWhitelisted(signers[3].address, proof),
      ).to.equal(false);
    });

    it('should return false for incorrect proof', async function () {
      const proof = merkleTree.getHexProof(whitelistAddresses[1]);
      expect(
        await boredNFT
          .connect(whitelistAddresses[0])
          .isWhitelisted(whitelistAddresses[0], proof),
      ).to.equal(false);
    });
  });
});
