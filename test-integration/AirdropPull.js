const { ethers, web3, artifacts, contract } = require("@nomiclabs/buidler");
const {
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const { BN } = require("@openzeppelin/test-helpers");
const ERC20 = artifacts.require("ERC20");
const AirdropPull = artifacts.require("AirdropPull");

const DAI_WHALE = '0x131a9A36Ea25aFB4Ed1a4510eE4B36E369d0F699'
const USDC_WHALE = '0x8cee3eeab46774c1CDe4F6368E3ae68BcCd760Bf'
const USDT_WHALE = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8'
const FWB_WHALE = '0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81'

async function formattedAmount(token, value) {
  const decimals = await token.decimals.call()
  return ((new BN("10").pow(decimals)).mul(new BN(value))).toString()
}

async function acquireToken(fundAccount, receiver, token, amt) {
  // NOTE: Ganache is setup to control the WHALE addresses. This method moves requeted funds out of the fund account and into the specified wallet

  // fund the account with ETH so it can move funds
  await web3.eth.sendTransaction({ from: receiver, to: fundAccount, value: 1e10 })

  const funds = await formattedAmount(token, amt)

  await token.transfer(receiver, funds, { from: fundAccount })
  const tokenBal = await token.balanceOf(receiver)
  console.log(`${token.address} Balance: ${tokenBal.toString()}`)
}

async function generateSignature(key, token, amt, recipient) {
  const wallet = new ethers.Wallet(key)
  const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [token, recipient, amt])
  const message = ethers.utils.arrayify(hash)
  const signature = await wallet.signMessage(message)
  return signature
}

contract("AirdropPull Integration Test", async (accounts) => {
  const [owner, randomUser1, randomUser2, randomUser3, randomUser4] = accounts;
  const amt = "1000"
  const claimAmt = "10"

  let distributor
  let FWB
  let DAI
  let USDC
  let USDT
  let user1Sig
  let user2Sig
  let user3Sig
  let user4Sig

  before(async () => {

    DAI = await ERC20.at("0x6B175474E89094C44Da98b954EedeAC495271d0F")
    USDC = await ERC20.at("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    USDT = await ERC20.at("0xdAC17F958D2ee523a2206206994597C13D831ec7")
    FWB = await ERC20.at("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")

    await acquireToken(DAI_WHALE, owner, DAI, amt)
    await acquireToken(USDC_WHALE, owner, USDC, amt)
    await acquireToken(USDT_WHALE, owner, USDT, amt)
    await acquireToken(FWB_WHALE, owner, FWB, amt)

    distributor = await AirdropPull.new()

    await DAI.transfer(distributor.address, amt)
    await USDC.transfer(distributor.address, amt)
    await USDT.transfer(distributor.address, amt)
    await FWB.transfer(distributor.address, amt)

    // NOTE: .env PRIVATE_KEY is set to owner private key

    // owner of the contract signs the message of which the contract validates
    user1Sig = await generateSignature(process.env.PRIVATE_KEY, DAI.address, claimAmt, randomUser1)
    user2Sig = await generateSignature(process.env.PRIVATE_KEY, USDC.address, claimAmt, randomUser2)
    user3Sig = await generateSignature(process.env.PRIVATE_KEY, USDT.address, claimAmt, randomUser3)
    user4Sig = await generateSignature(process.env.PRIVATE_KEY, FWB.address, claimAmt, randomUser4)

  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test users can claim", async () => {
      await distributor.claim(DAI.address, randomUser1, claimAmt, user1Sig);
      await distributor.claim(USDC.address, randomUser2, claimAmt, user2Sig);
      await distributor.claim(USDT.address, randomUser3, claimAmt, user3Sig);
      await distributor.claim(FWB.address, randomUser4, claimAmt, user4Sig);

      const user1Bal = await DAI.balanceOf(randomUser1)
      assert(user1Bal, claimAmt)

      const user2Bal = await USDC.balanceOf(randomUser2)
      assert(user2Bal, claimAmt)

      const user3Bal = await USDT.balanceOf(randomUser3)
      assert(user3Bal, claimAmt)

      const user4Bal = await FWB.balanceOf(randomUser4)
      assert(user4Bal, claimAmt)
    })

    it("Test owner is able to claim remaining amounts", async () => {
      const daiBal = await DAI.balanceOf(distributor.address)
      const usdcBal = await USDC.balanceOf(distributor.address)
      const usdtBal = await USDT.balanceOf(distributor.address)
      const fwbBal = await FWB.balanceOf(distributor.address)

      const ownerDAISig = await generateSignature(process.env.PRIVATE_KEY, DAI.address, daiBal.toString(), owner)
      const ownerUSDCSig = await generateSignature(process.env.PRIVATE_KEY, USDC.address, usdcBal.toString(), owner)
      const ownerUSDTSig = await generateSignature(process.env.PRIVATE_KEY, USDT.address, usdtBal.toString(), owner)
      const ownerFWBSig = await generateSignature(process.env.PRIVATE_KEY, FWB.address, fwbBal.toString(), owner)

      await distributor.claim(DAI.address, owner, daiBal.toString(), ownerDAISig);
      await distributor.claim(USDC.address, owner, usdcBal.toString(), ownerUSDCSig);
      await distributor.claim(USDT.address, owner, usdtBal.toString(), ownerUSDTSig);
      await distributor.claim(FWB.address, owner, fwbBal.toString(), ownerFWBSig);

      const remDAIBal = await DAI.balanceOf(distributor.address)
      assert(remDAIBal.toString(), "0")

      const remUSDCBal = await USDC.balanceOf(distributor.address)
      assert(remUSDCBal.toString(), "0")

      const remUSDTBal = await USDT.balanceOf(distributor.address)
      assert(remUSDTBal, "0")

      const remFWBBal = await FWB.balanceOf(distributor.address)
      assert(remFWBBal, "0")
    })
  })
});
