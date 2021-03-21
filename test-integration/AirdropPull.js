require('dotenv').config()
const { expect } = require("chai");
const { ethers, artifacts } = require("hardhat");
const timeMachine = require("ganache-time-traveler");
const BN = ethers.BigNumber
const ERC20 = artifacts.require("ERC20");

const DAI_WHALE = '0x13aec50f5d3c011cd3fed44e2a30c515bd8a5a06'
const USDC_WHALE = '0x55fe002aeff02f77364de339a1292923a15844b8'
const USDT_WHALE = '0x5754284f345afc66a98fbb0a0afe71e0f007b949'
const FWB_WHALE = '0x6b9a9c31214fbcb2265e2a6331e5b8487217503f'

async function formattedAmount(token, value) {
  const decimals = await token.decimals.call()
  return ((BN.from("10").pow(decimals)).mul(BN.from(value))).toString()
}

async function acquireToken(funderAddress, receiver, token, amount) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [funderAddress],
  });
  const funder = await ethers.provider.getSigner(funderAddress);

  // fund the account with ETH so it can move funds
  await receiver.sendTransaction({
    to: funderAddress,
    value: ethers.utils.parseEther("1").toHexString()
  });

  const funds = await formattedAmount(token, amount)

  await token.connect(funder).transfer(receiver.address, funds)
  const tokenBal = await token.connect(receiver).balanceOf(receiver.address)
  console.log(`${token.address} Balance: ${tokenBal.toString()}`)
}
async function generateSignature(key, token, amt, recipient) {
  const wallet = new ethers.Wallet(key)
  const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [token, recipient, amt])
  const message = ethers.utils.arrayify(hash)
  const signature = await wallet.signMessage(message)
  return signature
}

describe("AirdropPull Integration Test", () => {
  let deployer
  let randomUser1
  let randomUser2
  let randomUser3
  let randomUser4

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

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    [deployer, randomUser1, randomUser2, randomUser3, randomUser4] = await ethers.getSigners();

    DAI = await ethers.getContractAt(ERC20.abi, "0x6B175474E89094C44Da98b954EedeAC495271d0F")
    USDC = await ethers.getContractAt(ERC20.abi, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    USDT = await ethers.getContractAt(ERC20.abi, "0xdAC17F958D2ee523a2206206994597C13D831ec7")
    FWB = await ethers.getContractAt(ERC20.abi, "0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")

    await acquireToken(DAI_WHALE, deployer, DAI, "1000")
    await acquireToken(USDC_WHALE, deployer, USDC, "1000")
    await acquireToken(USDT_WHALE, deployer, USDT, "1000")
    await acquireToken(FWB_WHALE, deployer, FWB, "1000")

    const distributorFactory = await ethers.getContractFactory('AirdropPull')
    distributor = await distributorFactory.deploy()
    await distributor.deployed()

    await DAI.connect(deployer).transfer(distributor.address, amt)
    await USDC.connect(deployer).transfer(distributor.address, amt)
    await USDT.connect(deployer).transfer(distributor.address, amt)
    await FWB.connect(deployer).transfer(distributor.address, amt)

    // NOTE: .env PRIVATE_KEY is set to owner private key

    // owner of the contract signs the message of which the contract validates
    user1Sig = await generateSignature(process.env.SIGNER, DAI.address, claimAmt, randomUser1.address)
    user2Sig = await generateSignature(process.env.SIGNER, USDC.address, claimAmt, randomUser2.address)
    user3Sig = await generateSignature(process.env.SIGNER, USDT.address, claimAmt, randomUser3.address)
    user4Sig = await generateSignature(process.env.SIGNER, FWB.address, claimAmt, randomUser4.address)
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      const owner = await distributor.owner()
      expect(owner).to.equal(deployer.address)
    })

    it("Test users can claim", async () => {
      await distributor.connect(randomUser1).claim(DAI.address, randomUser1.address, claimAmt, user1Sig);
      await distributor.connect(randomUser2).claim(USDC.address, randomUser2.address, claimAmt, user2Sig);
      await distributor.connect(randomUser3).claim(USDT.address, randomUser3.address, claimAmt, user3Sig);
      await distributor.connect(randomUser4).claim(FWB.address, randomUser4.address, claimAmt, user4Sig);

      const user1Bal = await DAI.connect(randomUser1).balanceOf(randomUser1.address)
      expect(user1Bal).to.equal(claimAmt)
      const user2Bal = await USDC.connect(randomUser2).balanceOf(randomUser2.address)
      expect(user2Bal).to.equal(claimAmt)
      const user3Bal = await USDT.connect(randomUser3).balanceOf(randomUser3.address)
      expect(user3Bal).to.equal(claimAmt)
      const user4Bal = await FWB.connect(randomUser4).balanceOf(randomUser4.address)
      expect(user4Bal).to.equal(claimAmt)
    })

    it("Test owner is able to claim remaining amounts", async () => {
      const daiBal = await DAI.connect(deployer).balanceOf(distributor.address)
      const usdcBal = await USDC.connect(deployer).balanceOf(distributor.address)
      const usdtBal = await USDT.connect(deployer).balanceOf(distributor.address)
      const fwbBal = await FWB.connect(deployer).balanceOf(distributor.address)

      const deployerDAISig = await generateSignature(process.env.SIGNER, DAI.address, daiBal, deployer.address)
      const deployerUSDCSig = await generateSignature(process.env.SIGNER, USDC.address, usdcBal, deployer.address)
      const deployerUSDTSig = await generateSignature(process.env.SIGNER, USDT.address, usdtBal, deployer.address)
      const deployerFWBSig = await generateSignature(process.env.SIGNER, FWB.address, fwbBal, deployer.address)

      await distributor.connect(deployer).claim(DAI.address, deployer.address, daiBal.toString(), deployerDAISig);
      await distributor.connect(deployer).claim(USDC.address, deployer.address, usdcBal.toString(), deployerUSDCSig);
      await distributor.connect(deployer).claim(USDT.address, deployer.address, usdtBal.toString(), deployerUSDTSig);
      await distributor.connect(deployer).claim(FWB.address, deployer.address, fwbBal.toString(), deployerFWBSig);

      const remDAIBal = await DAI.balanceOf(distributor.address)
      expect(remDAIBal).to.equal(0)

      const remUSDCBal = await USDC.balanceOf(distributor.address)
      expect(remUSDCBal).to.equal(0)

      const remUSDTBal = await USDT.balanceOf(distributor.address)
      expect(remUSDTBal).to.equal(0)

      const remFWBBal = await FWB.balanceOf(distributor.address)
      expect(remFWBBal).to.equal(0)
    })
  })
});