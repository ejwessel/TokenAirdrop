const { ethers, web3, artifacts, contract } = require("@nomiclabs/buidler");
const {
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const timeMachine = require("ganache-time-traveler");
const MockContract = artifacts.require("MockContract");
const IERC20 = artifacts.require("IERC20");
const AirdropPush = artifacts.require("AirdropPush");

contract("AirdropPush Unit Test", async (accounts) => {
  const [owner, randomUser1, randomUser2, randomUser3] = accounts;

  let distributor
  let mockToken
  let snapshotId

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    mockToken = await MockContract.new()
    distributor = await AirdropPush.new()
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test distirbutes only callable by owner", async () => {
      await expectRevert(
        distributor.distirbute(
          mockToken.address,
          [constants.ZERO_ADDRESS],
          [0],
          { from: randomUser1 }
        ),
        "Ownable: caller is not the owner"
      )
    })

    it("Test distirbutes distribute to users", async () => {
      const TokenInterface = new ethers.utils.Interface(IERC20.abi)
      const transferFrom = TokenInterface.encodeFunctionData('transferFrom', [constants.ZERO_ADDRESS, constants.ZERO_ADDRESS, 0])
      await mockToken.givenMethodReturnBool(transferFrom, true)

      await distributor.distirbute(
        mockToken.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 100, 1000],
        { from: owner }
      )
      const count = await mockToken.invocationCountForMethod.call(transferFrom)
      assert(count, 3)
    })
  })
});
