const { ethers, web3, artifacts, contract } = require("@nomiclabs/buidler");
const {
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const { BN } = require("@openzeppelin/test-helpers");
const ERC20 = artifacts.require("ERC20");
const AirdropPush = artifacts.require("AirdropPush");

const DAI_WHALE = '0x131a9A36Ea25aFB4Ed1a4510eE4B36E369d0F699'
const USDC_WHALE = '0x8cee3eeab46774c1CDe4F6368E3ae68BcCd760Bf'
const USDT_WHALE = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8'
const FWB_WHALE = '0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81'

async function formattedAmount(token, value) {
  const decimals = await token.decimals.call()
  return ((new BN("10").pow(decimals)).mul(new BN(value))).toString()
}

async function acquireToken(fundAccount, receiver, token, amount) {
  // NOTE: Ganache is setup to control the WHALE addresses. This method moves requeted funds out of the fund account and into the specified wallet

  // fund the account with ETH so it can move funds
  await web3.eth.sendTransaction({ from: receiver, to: fundAccount, value: 1e10 })

  const funds = await formattedAmount(token, amount)

  await token.transfer(receiver, funds, { from: fundAccount })
  const tokenBal = await token.balanceOf(receiver)
  console.log(`${token.address} Balance: ${tokenBal.toString()}`)
}

contract("AirdropPush Integration Test", async (accounts) => {
  const [owner, randomUser1, randomUser2, randomUser3] = accounts;

  let distributor
  let FWB
  let DAI
  let USDC
  let USDT

  before(async () => {

    DAI = await ERC20.at("0x6B175474E89094C44Da98b954EedeAC495271d0F")
    USDC = await ERC20.at("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    USDT = await ERC20.at("0xdAC17F958D2ee523a2206206994597C13D831ec7")
    FWB = await ERC20.at("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")

    await acquireToken(DAI_WHALE, owner, DAI, "1000")
    await acquireToken(USDC_WHALE, owner, USDC, "1000")
    await acquireToken(USDT_WHALE, owner, USDT, "1000")
    await acquireToken(FWB_WHALE, owner, FWB, "1000")

    distributor = await AirdropPush.new()
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test distribute only callable by owner", async () => {
      await expectRevert(
        distributor.distribute(
          FWB.address,
          [constants.ZERO_ADDRESS],
          [0],
          { from: randomUser1 }
        ),
        "Ownable: caller is not the owner"
      )
    })

    it("Test distribute distribute to users", async () => {
      await FWB.approve(distributor.address, 30)
      await distributor.distribute(
        FWB.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const ownerBal = await FWB.balanceOf(owner)

      const user1Bal = await FWB.balanceOf(randomUser1)
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await FWB.balanceOf(randomUser2)
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await FWB.balanceOf(randomUser3)
      assert.equal(user3Bal.toNumber(), 10)
    })

    it("Test distribute distribute to users DAI", async () => {
      await DAI.approve(distributor.address, 30)
      await distributor.distribute(
        DAI.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const ownerBal = await DAI.balanceOf(owner)

      const user1Bal = await DAI.balanceOf(randomUser1)
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await DAI.balanceOf(randomUser2)
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await DAI.balanceOf(randomUser3)
      assert.equal(user3Bal.toNumber(), 10)
    })

    it("Test distribute distribute to users USDC", async () => {
      await USDC.approve(distributor.address, 30)
      await distributor.distribute(
        USDC.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const ownerBal = await USDC.balanceOf(owner)

      const user1Bal = await USDC.balanceOf(randomUser1)
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await USDC.balanceOf(randomUser2)
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await USDC.balanceOf(randomUser3)
      assert.equal(user3Bal.toNumber(), 10)
    })

    it("Test distribute distribute to users USDT", async () => {
      await USDT.approve(distributor.address, 30)
      await distributor.distribute(
        USDT.address,
        [randomUser1, randomUser2, randomUser3],
        [10, 10, 10],
        { from: owner }
      )

      const ownerBal = await USDT.balanceOf(owner)

      const user1Bal = await USDT.balanceOf(randomUser1)
      assert.equal(user1Bal.toNumber(), 10)
      const user2Bal = await USDT.balanceOf(randomUser2)
      assert.equal(user2Bal.toNumber(), 10)
      const user3Bal = await USDT.balanceOf(randomUser3)
      assert.equal(user3Bal.toNumber(), 10)
    })
  })
});
