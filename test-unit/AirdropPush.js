const { expect } = require("chai");
const { ethers, waffle, artifacts } = require("hardhat");
const { deployMockContract } = waffle

const timeMachine = require("ganache-time-traveler");
const IERC20 = artifacts.require("IERC20");

describe("AirdropPush Unit Test", () => {
  let deployer
  let distributorContract
  let mockToken
  let snapshotId
  let randomUser1
  let randomUser2
  let randomUser3

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    [deployer, randomUser1, randomUser2, randomUser3] = await ethers.getSigners();
    mockToken = await deployMockContract(deployer, IERC20.abi)
    const distributorFactory = await ethers.getContractFactory('AirdropPush')
    distributorContract = await distributorFactory.connect(deployer).deploy()
    await distributorContract.deployed()
  });

  describe("Test Distributions", async () => {
    it("Test distribution to users passes", async () => {
      // NOTE: generally an approval from the token would need to be made to the distributor
      await mockToken.mock.transferFrom.returns(true)

      await expect(distributorContract.connect(deployer).distribute(
        mockToken.address,
        [randomUser1.address, randomUser2.address, randomUser3.address],
        [10, 100, 1000]
      )).to.not.be.reverted

      // NOTE: tokens would be transferred after this
    })
  })
});
