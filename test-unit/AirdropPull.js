require('dotenv').config()
const { expect } = require("chai");
const { ethers, waffle, artifacts } = require("hardhat");
const { solidityKeccak256: keccack256, arrayify } = ethers.utils
const { deployMockContract } = waffle
const timeMachine = require("ganache-time-traveler");
const IERC20 = artifacts.require("IERC20")

async function generateSignature(signer, token, amt, recipient) {
  // const wallet = new ethers.Wallet(key)
  const hash = keccack256(['address', 'address', 'uint256'], [token, recipient, amt])
  const message = arrayify(hash)
  const signature = await signer.signMessage(message)
  return signature
}

describe("AirdropPull Unit Test", () => {
  const amount = "1000"
  let deployer
  let recipient
  let distributor;
  let mockToken;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    [deployer, recipient] = await ethers.getSigners();
    const distributorFactory = await ethers.getContractFactory("AirdropPull")
    distributor = await distributorFactory.connect(deployer).deploy()
    await distributor.deployed()
    mockToken = await deployMockContract(deployer, IERC20.abi)
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      const contractOwner = await distributor.owner()
      expect(contractOwner).to.equal(deployer.address)
    })

    it("Test user claiming passes", async () => {
      const signature = await generateSignature(deployer, mockToken.address, amount, recipient.address)
      await mockToken.mock.transfer.returns(true)
      await expect(distributor.connect(recipient).claim(mockToken.address, recipient.address, amount, signature)).to.emit(distributor, 'Claimed').withArgs(mockToken.address, recipient.address, amount)
    });

    it("Test user claiming with used signature fails", async () => {
      const signature = await generateSignature(deployer, mockToken.address, amount, recipient.address)
      await mockToken.mock.transfer.returns(true)
      // claim with signature
      await distributor.connect(recipient).claim(mockToken.address, recipient.address, amount, signature);
      // invalid with signature again
      await expect(distributor.connect(recipient).claim(mockToken.address, recipient.address, amount, signature)).to.be.revertedWith("Invalid signature");
    })

    it("Test user claiming with invalid signature fails", async () => {
      const signature = await generateSignature(recipient, mockToken.address, amount, recipient.address)
      await expect(distributor.connect(recipient).claim(mockToken.address, recipient.address, amount, signature)).to.be.revertedWith("Invalid signature");
    })
  });
})