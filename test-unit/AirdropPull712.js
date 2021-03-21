const { expect } = require("chai");
const { ethers, artifacts, waffle } = require("hardhat");
const { BN } = ethers.BigNumber
const { deployMockContract } = waffle
const { AddressZero } = ethers.constants
const timeMachine = require("ganache-time-traveler");
const IERC20 = artifacts.require("IERC20")
const ROTATED_SIGNER = process.env.ACCOUNT_2
const DEV_CHAIN_ID = 31337

async function generateSignature(signer, contract, nonce, recipient, amount, chain = DEV_CHAIN_ID) {
  const domain = {
    name: 'Airdrop Signature',
    version: '1',
    chainId: chain,
    verifyingContract: contract
  }
  const types = {
    Recipient: [
      { name: 'nonce', type: 'uint256' },
      { name: 'wallet', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ]
  }
  const data = {
    nonce: nonce,
    wallet: recipient,
    amount: amount
  }

  // const provider = ethers.getDefaultProvider('mainnet', { projectId: process.env.INFURA_API_KEY })
  // const provider = ethers.provider
  // const wallet = new ethers.Wallet(key, provider)
  let signature = await signer._signTypedData(domain, types, data)
  signature = signature.slice(2)
  const r = "0x" + signature.substring(0, 64);
  const s = "0x" + signature.substring(64, 128);
  const v = parseInt(signature.substring(128, 130), 16);
  return { r, s, v }
}

describe("AirdropPull712 Unit Test", () => {
  let deployer
  let rotatedSigner
  let recipient1
  let recipient2
  let rewardDistributorFactory
  let rewardDistributor;
  let mockToken;
  let snapshotId;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    [deployer, rotatedSigner, recipient1, recipient2] = await ethers.getSigners()
    mockToken = await deployMockContract(deployer, IERC20.abi)
    rewardDistributorFactory = await ethers.getContractFactory('AirdropPull712')
    rewardDistributor = await rewardDistributorFactory.connect(deployer).deploy(mockToken.address, deployer.address)
    await rewardDistributor.deployed()
  });

  describe("Test Constructor", async () => {
    it("Test Invalid Token Address fails", async () => {
      await expect(rewardDistributorFactory.connect(deployer).deploy(AddressZero, deployer.address)).to.be.revertedWith("Invalid Token")
    })

    it("Test Invalid Signer Address fails", async () => {
      await expect(rewardDistributorFactory.connect(deployer).deploy(mockToken.address, AddressZero)).to.be.revertedWith("Invalid Signer Address")
    })
  })

  describe("Test Defaults", async () => {
    it("Test APY Contract set", async () => {
      const token = await rewardDistributor.token()
      expect(token).to.equal(mockToken.address)
    })

    it("Test Signer set", async () => {
      const signerAddress = await rewardDistributor.signerAddress()
      expect(signerAddress).to.equal(deployer.address)
    })

    it("Test Owner is set", async () => {
      const ownerAddress = await rewardDistributor.owner()
      expect(ownerAddress).to.equal(deployer.address)
    })
  })

  describe("Test Setters", async () => {
    it("Test setting signer by not owner fails", async () => {
      await expect(rewardDistributor.connect(recipient1).setSigner(recipient1.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Test setting signer by owner passes", async () => {
      await rewardDistributor.connect(deployer).setSigner(rotatedSigner.address)
      const newSigner = await rewardDistributor.signerAddress()
      expect(newSigner).to.equal(rotatedSigner.address)
    })
  })

  describe("Test Claiming", async () => {
    it("Test Signature mismatch fails", async () => {
      const { r, s, v } = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, 1)

      const recipientData = [0, recipient1.address, 2]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, v, r, s)).to.be.revertedWith("Invalid Signature")
    });

    it("Test claiming more than available balance of contract fails", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount - 1)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)).to.be.revertedWith("Insufficient Funds")
    });

    it("Test claiming for another user passes", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]

      // another recipient claims
      await expect(rewardDistributor.connect(recipient2).claim(recipientData, sig1.v, sig1.r, sig1.s)).to.not.be.reverted
    });

    it("Test all funds can be removed from contract passes", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)).to.not.be.reverted
    });

    it("Test claiming when signer changes passes", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)

      await rewardDistributor.connect(deployer).setSigner(rotatedSigner.address)

      const sig2 = await generateSignature(rotatedSigner, rewardDistributor.address, 1, recipient1.address, amount)
      recipientData = [1, recipient1.address, amount]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, sig2.v, sig2.r, sig2.s)).to.not.be.reverted
    });

    it("Test Claim event is emitted", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)).to.emit(rewardDistributor, 'Claimed').withArgs(0, recipient1.address, amount)
    });

    it("Test reuse of nonce fails", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)
      await expect(rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s)).to.be.revertedWith("Nonce Mismatch")
    })

    it("Test signing with incorrect nonce fails", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 1, recipient1.address, amount)
      let recipientData = [1, recipient1.address, amount]
      await expect(rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s)).to.be.revertedWith("Nonce Mismatch")
    })

    it("Test successful signature and valid transfer", async () => {
      const amount = 10
      await mockToken.mock.transfer.returns(true)
      await mockToken.mock.balanceOf.returns(amount)

      const sig1 = await generateSignature(deployer, rewardDistributor.address, 0, recipient1.address, amount)
      let recipientData = [0, recipient1.address, amount]
      await expect(rewardDistributor.connect(recipient1).claim(recipientData, sig1.v, sig1.r, sig1.s)).to.not.be.reverted
    })
  });
});