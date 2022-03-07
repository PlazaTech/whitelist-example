import { ethers, getNamedAccounts } from 'hardhat';
import { expect } from 'chai';
import { BoredNFT } from '../../src/types/BoredNFT';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deploy } from './utils/ethersHelpers';
import { BigNumber } from '@ethersproject/bignumber';
import { sign } from 'crypto';
import { Wallet } from '@ethersproject/wallet';
import { MerkleTree } from '../src/utils/merkleHelper';
import { Signer } from '@ethersproject/abstract-signer';
describe('boredNFT', () => {
  let signers: SignerWithAddress[];
  let boredNFT: BoredNFT;
  let teamAddress = '';
  const congressManAmount = 1;
  const reservedNFT = 150;
  let mintFee: BigNumber;
  let merkleTree: MerkleTree;
  let merkleRoot: string;
  let elements: string[];
  const totalToBeMinted = 1800;
  beforeEach(async () => {
    signers = await ethers.getSigners();
    elements = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
    ];
    ({ teamAddress } = await getNamedAccounts());
    merkleTree = new MerkleTree(elements);

    merkleRoot = merkleTree.getHexRoot();

    boredNFT = await deploy<BoredNFT>(
      'BoredNFT',
      undefined,
      'https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/',
      teamAddress,
      totalToBeMinted,
      150,
      2000,
      merkleRoot,
    );
    await boredNFT.pause(false);
    await boredNFT.presale(false);
    mintFee = await boredNFT._price();
    // mint uad for whale
  });
  it('should have URI per token', async () => {
    const uri = await boredNFT.tokenURI(0);
    expect(uri).to.equal(
      `https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/0`,
    );
  });
  it('should have name', async () => {
    const name = await boredNFT.name();
    expect(name).to.equal(`BoredNFT`);
  });
  it('should have symbol', async () => {
    const symbol = await boredNFT.symbol();
    expect(symbol).to.equal(`BNFT`);
  });
  it('set URI should work', async () => {
    const newURI = 'https://gateway.pinata.cloud/ipfs/new/';
    await boredNFT.setBaseURI(newURI);
    const uri = await boredNFT.tokenURI(0);
    expect(uri).to.equal(`${newURI}0`);
  });
  it('set URI should revert if not admin', async () => {
    const newURI = 'https://gateway.pinata.cloud/ipfs/new/';
    await expect(
      boredNFT.connect(signers[1]).setBaseURI(newURI),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  it('setPresalesParam should revert if not admin', async () => {
    await expect(
      boredNFT.connect(signers[1]).setPresalesParam(merkleRoot, 4),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  it('setPresalesParam should work', async () => {
    const _merkleRoot = await boredNFT._merkleRoot();
    const presaleReserved = await boredNFT._presaleReserved();
    expect(merkleRoot).to.equal(_merkleRoot);
    const newroot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('yolo'));
    await boredNFT.setPresalesParam(newroot, 4);
    expect(await boredNFT._merkleRoot()).to.equal(newroot);
    expect(await boredNFT._presaleReserved()).to.equal(4);
  });
  it('deployment should mint the first congress man', async () => {
    const Ids = await boredNFT.walletOfOwner(teamAddress);
    expect(Ids.length).to.equal(congressManAmount);
    expect(Ids[congressManAmount - 1]).to.equal(congressManAmount - 1);
    expect(await boredNFT.totalSupply()).to.equal(congressManAmount);
  });
  it('summon should work', async () => {
    await expect(boredNFT.connect(signers[1]).summon(1, { value: mintFee }))
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[1].address,
        congressManAmount,
      );
  });
  it('summon should revert with amount > _maxBoredPerWallet', async () => {
    const maxBoredPerWallet = await boredNFT._maxBoredPerWallet();
    await expect(
      boredNFT.connect(signers[1]).summon(maxBoredPerWallet.toNumber() + 1),
    ).to.be.revertedWith('!BoredAmount');
  });
  it('summon should revert with amount > 1 and not enough ETH ', async () => {
    await expect(
      boredNFT.connect(signers[1]).summon(1, { value: mintFee.sub(1) }),
    ).to.be.revertedWith('!EthAmount');
  });
  it('summon should work with amount > 1 ', async () => {
    await expect(
      boredNFT.connect(signers[1]).summon(2, { value: mintFee.mul(2) }),
    )
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[1].address,
        congressManAmount,
      )
      .and.to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[1].address,
        congressManAmount + 1,
      );
  });
  it('summon should work with amount > 1  and too much ETH  ', async () => {
    const balanceBefore = await signers[1].getBalance();
    const tx = await boredNFT
      .connect(signers[1])
      .summon(2, { value: mintFee.mul(100) });
    expect(tx)
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[1].address,
        congressManAmount,
      );
    const receipt = await tx.wait();
    const balanceAfter = await signers[1].getBalance();

    expect(balanceBefore.sub(balanceAfter)).to.equal(
      mintFee
        .mul(100)
        .add((tx.gasPrice ?? BigNumber.from(0)).mul(receipt.gasUsed)),
    );
  });
  it('summon should work with amount = 1 ', async () => {
    await expect(
      boredNFT
        .connect(signers[2])
        .summon(1, { value: ethers.utils.parseEther('0.6') }),
    )
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[2].address,
        congressManAmount,
      );
    await expect(boredNFT.connect(signers[1]).summon(1, { value: mintFee }))
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[1].address,
        congressManAmount + 1,
      );
  });
  it('summon should revert if not enough ETH', async () => {
    await expect(
      boredNFT.connect(signers[2]).summon(1, { value: mintFee.sub(1) }),
    ).to.be.revertedWith('!EthAmount');
  });
  it('summon should revert if not enough ETH for two', async () => {
    await expect(
      boredNFT.connect(signers[2]).summon(2, { value: mintFee.mul(2).sub(1) }),
    ).to.be.revertedWith('!EthAmount');
  });
  it('summon should revert if no ETH', async () => {
    await expect(boredNFT.connect(signers[2]).summon(1)).to.be.revertedWith(
      '!EthAmount',
    );
  });
  it('summon should revert with more than _maxBoredPerWallet per address ', async () => {
    const maxBoredPerWallet = (await boredNFT._maxBoredPerWallet()).toNumber();
    await boredNFT
      .connect(signers[2])
      .summon(maxBoredPerWallet, { value: mintFee.mul(maxBoredPerWallet) });
    await expect(
      boredNFT.connect(signers[2]).summon(1, { value: mintFee }),
    ).to.be.revertedWith('!BoredAmount');
  });
  it('summon should work with amount = 2 ', async () => {
    await expect(
      boredNFT.connect(signers[2]).summon(2, { value: mintFee.mul(2) }),
    )
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[2].address,
        congressManAmount,
      )
      .and.to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[2].address,
        congressManAmount + 1,
      );
  });
  it('summon should revert with 0 amount ', async () => {
    await expect(boredNFT.connect(signers[1]).summon(0)).to.be.revertedWith(
      '!BoredAmount',
    );
  });
  it('walletOfOwner should work with amount = 2 ', async () => {
    await expect(
      boredNFT.connect(signers[2]).summon(2, { value: mintFee.mul(2) }),
    )
      .to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[2].address,
        congressManAmount,
      )
      .and.to.emit(boredNFT, 'Transfer')
      .withArgs(
        ethers.constants.AddressZero,
        signers[2].address,
        congressManAmount + 1,
      );
    const ids = await (
      await boredNFT.walletOfOwner(signers[2].address)
    ).map(id => id.toNumber());
    expect(ids).eql([congressManAmount, congressManAmount + 1]);
  });
  it('getPrice should work', async () => {
    const price = await boredNFT.getPrice();
    expect(price).to.equal(mintFee);
  });
  it('setPrice should work', async () => {
    const priceBefore = await boredNFT.getPrice();
    expect(priceBefore).to.equal(mintFee);
    await boredNFT.setPrice(mintFee.mul(2));
    const priceAfter = await boredNFT.getPrice();
    expect(priceAfter).to.equal(mintFee.mul(2));
  });
  it('setPrice should revert if not admin', async () => {
    await expect(
      boredNFT.connect(signers[1]).setPrice(mintFee.mul(2)),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  it('setMaxBoredPerWallet should revert if not admin', async () => {
    await expect(
      boredNFT.connect(signers[1]).setMaxBoredPerWallet(4),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  it('setMaxBoredPerWallet should work', async () => {
    const before = await boredNFT._maxBoredPerWallet();
    expect(before).to.equal(2);
    await boredNFT.setMaxBoredPerWallet(4);
    const after = await boredNFT._maxBoredPerWallet();
    expect(after).to.equal(4);
  });
  it('pause should work', async () => {
    let paused = await boredNFT._paused();
    expect(paused).to.be.false;
    await boredNFT.pause(true);
    paused = await boredNFT._paused();
    expect(paused).to.be.true;
  });
  it('pause should revert if not admin', async () => {
    await expect(boredNFT.connect(signers[1]).pause(false)).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });
  it('give away should revert if not admin', async () => {
    await expect(
      boredNFT.connect(signers[1]).giveAway(signers[0].address, 1),
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });
  it('give away should revert if > reserved amount', async () => {
    await expect(
      boredNFT.giveAway(signers[1].address, reservedNFT + 1),
    ).to.be.revertedWith('>reserved');
  });
  it('give away should revert if  amount ==0', async () => {
    await expect(boredNFT.giveAway(signers[1].address, 0)).to.be.revertedWith(
      '_amount==0',
    );
  });
  it('give away should revert if to address is null', async () => {
    await expect(
      boredNFT.giveAway(ethers.constants.AddressZero, 1),
    ).to.be.revertedWith('_to==0');
  });
  it('give away should work for amount == 1', async () => {
    let ids = await (
      await boredNFT.walletOfOwner(signers[1].address)
    ).map(id => id.toNumber());
    expect(ids.length).to.equal(0);
    await boredNFT.giveAway(signers[1].address, 1);
    ids = await (
      await boredNFT.walletOfOwner(signers[1].address)
    ).map(id => id.toNumber());
    expect(ids).eql([congressManAmount]);
  });
  it('give away should work for amount == 100', async () => {
    let ids = await (
      await boredNFT.walletOfOwner(signers[1].address)
    ).map(id => id.toNumber());
    expect(ids.length).to.equal(0);
    await boredNFT.giveAway(signers[1].address, 100);
    ids = await (
      await boredNFT.walletOfOwner(signers[1].address)
    ).map(id => id.toNumber());
    expect(ids.length).equal(100);
    expect(ids[99]).equal(99 + congressManAmount);
  });
  describe('summon', () => {
    let signers: SignerWithAddress[];
    let boredNFT: BoredNFT;
    const reservedNFT = 150;
    let mintFee: BigNumber;
    let mintedNFT: number;
    let totalToBeMinted: number;
    let maxBoredPerWallet: number;
    before(async () => {
      signers = await ethers.getSigners();
      ({ teamAddress } = await getNamedAccounts());
      totalToBeMinted = 8888;
      boredNFT = await deploy<BoredNFT>(
        'BoredNFT',
        undefined,
        'https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/',
        teamAddress,
        totalToBeMinted,
        150,
        2000,
        merkleRoot,
      );
      await boredNFT.pause(false);
      await boredNFT.presale(false);
      mintFee = await boredNFT._price();
      maxBoredPerWallet = (await boredNFT._maxBoredPerWallet()).toNumber();
      // mint uad for whale
    });
    it('summon should work give away', async () => {
      totalToBeMinted = (await boredNFT._totalToBeMinted()).toNumber();

      await boredNFT.giveAway(signers[1].address, reservedNFT / 2);
      await boredNFT.giveAway(signers[1].address, reservedNFT / 2);
      mintedNFT = reservedNFT + congressManAmount;
      totalToBeMinted -= mintedNFT;
      expect(await boredNFT.totalSupply()).to.equal(mintedNFT);
      expect(await boredNFT.walletOfOwner(signers[1].address)).to.be.length(
        reservedNFT,
      );
    });
    it('summon should work for large amount ', async () => {
      let id = mintedNFT;
      const wholeMintFee = mintFee.mul(maxBoredPerWallet);
      let toMint = 1200;
      while (toMint > 0) {
        const acc = ethers.Wallet.createRandom().connect(ethers.provider);
        const accAdr = await acc.getAddress();

        await signers[1].sendTransaction({
          to: accAdr,
          value: wholeMintFee.mul(2),
        });
        await boredNFT
          .connect(acc)
          .summon(maxBoredPerWallet, { value: wholeMintFee });

        id += maxBoredPerWallet;

        mintedNFT += maxBoredPerWallet;
        totalToBeMinted -= maxBoredPerWallet;
        toMint -= maxBoredPerWallet;
      }

      expect((await boredNFT._totalToBeMinted()).toNumber()).to.equal(
        totalToBeMinted + mintedNFT,
      );
      expect(await boredNFT.totalSupply()).to.equal(mintedNFT);
    });
  });
  it('withdraw should revert if not admin', async () => {
    await expect(boredNFT.connect(signers[1]).withdrawAll()).to.be.revertedWith(
      'Ownable: caller is not the owner',
    );
  });
  it('withdraw should work  ', async () => {
    const teamBalanceBefore = await ethers.provider.getBalance(teamAddress);
    let tx = await boredNFT
      .connect(signers[1])
      .summon(2, { value: mintFee.mul(2) });
    tx = await boredNFT
      .connect(signers[2])
      .summon(2, { value: mintFee.mul(2) });

    await boredNFT.withdrawAll();
    const teamBalanceAfter = await ethers.provider.getBalance(teamAddress);

    expect(teamBalanceAfter.sub(teamBalanceBefore)).to.equal(mintFee.mul(4));
  });
  describe('whitelist', () => {
    let signers: SignerWithAddress[];
    let boredNFT: BoredNFT;
    let mintFee: BigNumber;
    let maxBoredPerWallet: number;
    let elements: string[] = [];
    const accounts: Wallet[] = [];
    let merkleTree: MerkleTree;
    let merkleRoot: string;
    const totalToBeMinted = 30;
    before(async () => {
      signers = await ethers.getSigners();
      ({ teamAddress } = await getNamedAccounts());
      for (let index = 0; index < 50; index++) {
        const acc = ethers.Wallet.createRandom().connect(ethers.provider);
        accounts.push(acc);
        elements.push(await acc.getAddress());
      }
      merkleTree = new MerkleTree(elements);
      merkleRoot = merkleTree.getHexRoot();
      boredNFT = await deploy<BoredNFT>(
        'BoredNFT',
        undefined,
        'https://gateway.pinata.cloud/ipfs/QmRUmQXc85qPcC4DBzxxg7MC7Cz9k8kWnDmaTqoLf6vADQ/',
        teamAddress,
        totalToBeMinted,
        10,
        5,
        merkleRoot,
      );
      await boredNFT.pause(false);
      await boredNFT.setMaxBoredPerWallet(5);
      mintFee = await boredNFT._price();
      maxBoredPerWallet = (await boredNFT._maxBoredPerWallet()).toNumber();
      // mint uad for whale
    });

    it('non whitelisted should revert  ', async () => {
      const proof = merkleTree.getHexProof(elements[0]);
      await expect(
        boredNFT
          .connect(signers[5])
          .whitelistSummon(1, proof, { value: mintFee }),
      ).to.be.revertedWith('!whitelist');
      const acc = ethers.Wallet.createRandom().connect(ethers.provider);
      await signers[1].sendTransaction({
        to: await acc.getAddress(),
        value: mintFee.mul(3),
      });
      await expect(
        boredNFT.connect(acc).whitelistSummon(1, proof, { value: mintFee }),
      ).to.be.revertedWith('!whitelist');
    });
    it('whitelisted should work  ', async () => {
      const curAcc = accounts[accounts.length / 2];

      const totalSupply = (await boredNFT.totalSupply()).toNumber();
      const _presaleReserved = (await boredNFT._presaleReserved()).toNumber();

      const proof = merkleTree.getHexProof(elements[accounts.length / 2]);
      await signers[1].sendTransaction({
        to: await curAcc.getAddress(),
        value: mintFee.mul(3),
      });
      await boredNFT
        .connect(curAcc)
        .whitelistSummon(1, proof, { value: mintFee });
    });
    it('mint more than reserved should revert ', async () => {
      const curAcc = accounts[accounts.length - 5];
      const proof = merkleTree.getHexProof(elements[accounts.length - 5]);
      const totalSupply = (await boredNFT.totalSupply()).toNumber();
      const _presaleReserved = (await boredNFT._presaleReserved()).toNumber();

      await signers[1].sendTransaction({
        to: await curAcc.getAddress(),
        value: mintFee.mul(_presaleReserved + 1),
      });
      await expect(
        boredNFT
          .connect(curAcc)
          .whitelistSummon(_presaleReserved + 1, proof, { value: mintFee }),
      ).to.be.revertedWith('>availableSupply');

      await boredNFT.connect(curAcc).whitelistSummon(_presaleReserved, proof, {
        value: mintFee.mul(_presaleReserved),
      });
      const reservedAfter = await boredNFT._presaleReserved();
      const totalSupplyafter = (await boredNFT.totalSupply()).toNumber();

      expect(reservedAfter).to.equal(0);
    });
    it('second whitelisted should work  ', async () => {
      const _merkleRoot = await boredNFT._merkleRoot();
      const presaleReserved = await boredNFT._presaleReserved();
      const newElements = [
        signers[0].address,
        signers[1].address,
        signers[2].address,
        signers[3].address,
      ];
      expect(merkleRoot).to.equal(_merkleRoot);
      const newMerkleTree = new MerkleTree(newElements);

      const newMerkleRoot = newMerkleTree.getHexRoot();
      expect(newMerkleRoot).not.to.equal(_merkleRoot);

      await boredNFT.setPresalesParam(newMerkleRoot, 4);
      const reservedAfter = await boredNFT._presaleReserved();
      expect(reservedAfter).to.equal(presaleReserved.toNumber() + 4);
      expect(await boredNFT._merkleRoot()).to.equal(newMerkleRoot);
      const proof = newMerkleTree.getHexProof(newElements[3]);
      await boredNFT
        .connect(signers[3])
        .whitelistSummon(1, proof, { value: mintFee });
    });
    it('verification should failed using the previous merkle tree', async () => {
      const curAcc = accounts[accounts.length - 5];

      const proof = merkleTree.getHexProof(elements[accounts.length - 5]);

      await expect(
        boredNFT
          .connect(signers[3])
          .whitelistSummon(1, proof, { value: mintFee }),
      ).to.be.revertedWith('!whitelist');
    });
    it('end presale should revert if not admin ', async () => {
      await expect(
        boredNFT.connect(signers[1]).presale(false),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('when presale ends and paused no whitelist summon should work  ', async () => {
      // restore previous merkle
      const presaleReserved = await boredNFT._presaleReserved();
      await boredNFT.setPresalesParam(merkleRoot, 0);
      const reservedAfter = await boredNFT._presaleReserved();
      expect(reservedAfter).to.equal(0);
      await boredNFT.setPresalesParam(merkleRoot, 3);
      const reservedAfter2 = await boredNFT._presaleReserved();
      expect(reservedAfter2).to.equal(3);

      await boredNFT.presale(false);
      await boredNFT.pause(true);
      expect(await boredNFT._paused()).to.be.true;

      const curAcc = accounts[accounts.length / 5];
      const proof = merkleTree.getHexProof(elements[accounts.length / 5]);
      await signers[1].sendTransaction({
        to: await curAcc.getAddress(),
        value: mintFee.mul(3),
      });
      await expect(
        boredNFT.connect(curAcc).whitelistSummon(1, proof, { value: mintFee }),
      ).to.be.revertedWith('Paused');
      await expect(
        boredNFT
          .connect(signers[3])
          .whitelistSummon(1, proof, { value: mintFee }),
      ).to.be.revertedWith('Paused');
    });
    it('when presale ends whitelisted revert and non whitelisted should work  ', async () => {
      await boredNFT.pause(false);
      const curAcc = accounts[accounts.length / 5];
      await signers[1].sendTransaction({
        to: await curAcc.getAddress(),
        value: mintFee.mul(3),
      });
      const proof = merkleTree.getHexProof(elements[accounts.length / 5]);
      const whitelistAccNFTLengthBefore = (
        await boredNFT.walletOfOwner(curAcc.address)
      ).length;
      await expect(
        boredNFT.connect(curAcc).whitelistSummon(1, proof, { value: mintFee }),
      ).to.revertedWith('!presale');

      const RegAccNFTLengthBefore = (
        await boredNFT.walletOfOwner(curAcc.address)
      ).length;
      await boredNFT.connect(curAcc).summon(1, { value: mintFee });
      const RegAccNFTLengthAfter = (
        await boredNFT.walletOfOwner(curAcc.address)
      ).length;
      expect(RegAccNFTLengthBefore + 1).to.equal(RegAccNFTLengthAfter);
    });
    it('all NFT should be minted  ', async () => {
      const presaleReserved = await boredNFT._presaleReserved();
      const reserved = await boredNFT._reserved();
      const totalToBeMinted = await boredNFT._totalToBeMinted();
      const totalSupply = await boredNFT.totalSupply();
      await boredNFT.giveAway(elements[accounts.length / 5], reserved);
      const reservedAfterGiveAway = await boredNFT._reserved();
      expect(reservedAfterGiveAway).to.equal(0);
      const totalSupplyAfterGiveAway = await boredNFT.totalSupply();
      expect(totalSupplyAfterGiveAway).to.equal(totalSupply.add(reserved));
      expect(totalSupplyAfterGiveAway).to.be.lt(totalToBeMinted);
      const balance = await boredNFT.balanceOf(signers[0].address);
      const remainingNFTToBeMinted = totalToBeMinted.sub(
        totalSupplyAfterGiveAway,
      );
      await boredNFT.setMaxBoredPerWallet(remainingNFTToBeMinted);
      await boredNFT.summon(remainingNFTToBeMinted, {
        value: mintFee.mul(remainingNFTToBeMinted),
      });
      const balanceAfterMint = await boredNFT.balanceOf(signers[0].address);
      expect(balanceAfterMint).to.equal(remainingNFTToBeMinted);
      const totalSupplyAfterMint = await boredNFT.totalSupply();
      expect(totalSupplyAfterMint).to.equal(
        totalSupplyAfterGiveAway.add(remainingNFTToBeMinted),
      );
      expect(totalSupplyAfterMint).to.equal(totalToBeMinted);
      await expect(
        boredNFT.connect(signers[7]).summon(1, { value: mintFee }),
      ).to.be.revertedWith('>MaxSupply');
    });
  });
});
