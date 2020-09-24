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
  let FWB

  before(async () => {
    FWB = await IERC20.at("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")
    distributor = await TokenBatchDistributor.new()
    console.log(distributor.address)
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test distributeTokens only callable by owner", async () => {
      await expectRevert(
        distributor.distributeTokens(
          FWB.address,
          [constants.ZERO_ADDRESS],
          [0],
          { from: randomUser1 }
        ),
        "Ownable: caller is not the owner"
      )
    })

    it("Test distributeTokens distributes to users", async () => {
      await FWB.approve(distributor.address, 30)
      await distributor.distributeTokens(
        FWB.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const ownerBal = await FWB.balanceOf(owner)
      console.log(ownerBal.toString())

      const user1Bal = await FWB.balanceOf(randomUser1)
      console.log(user1Bal.toString())
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await FWB.balanceOf(randomUser2)
      console.log(user2Bal.toString())
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await FWB.balanceOf(randomUser3)
      console.log(user3Bal.toString())
      assert.equal(user3Bal.toNumber(), 10)
    })
  })
});
