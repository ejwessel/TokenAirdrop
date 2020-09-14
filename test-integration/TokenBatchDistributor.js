const { ethers, web3, artifacts, contract } = require("@nomiclabs/buidler");
const {
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const IERC20 = artifacts.require("IERC20");
const TokenBatchDistributor = artifacts.require("TokenBatchDistributor");

contract("TokenBatchDistributor Unit Test", async (accounts) => {
  const [owner, randomUser1, randomUser2, randomUser3] = accounts;

  let distributor
  let FWBToken

  before(async () => {
    FWBToken = await IERC20.at("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")
    distributor = await TokenBatchDistributor.new()
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test distributeTokens only callable by owner", async () => {
      await expectRevert(
        distributor.distributeTokens(
          FWBToken.address,
          [constants.ZERO_ADDRESS],
          [0],
          { from: randomUser1 }
        ),
        "Ownable: caller is not the owner"
      )
    })

    it("Test distributeTokens distributes to users", async () => {
      await FWBToken.approve(distributor.address, 30)
      await distributor.distributeTokens(
        FWBToken.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const user1Bal = await FWBToken.balanceOf(randomUser1)
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await FWBToken.balanceOf(randomUser2)
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await FWBToken.balanceOf(randomUser3)
      assert.equal(user3Bal.toNumber(), 10)
    })
  })
});
