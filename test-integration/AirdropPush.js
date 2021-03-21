const { expect } = require("chai");
const { ethers, artifacts } = require("hardhat");
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

describe("AirdropPush Integration Test", () => {
  let deployer
  let randomUser1
  let randomUser2
  let randomUser3

  let distributor
  let FWB
  let DAI
  let USDC
  let USDT

  before(async () => {
    [deployer, randomUser1, randomUser2, randomUser3] = await ethers.getSigners();

    DAI = await ethers.getContractAt(ERC20.abi, "0x6B175474E89094C44Da98b954EedeAC495271d0F")
    USDC = await ethers.getContractAt(ERC20.abi, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    USDT = await ethers.getContractAt(ERC20.abi, "0xdAC17F958D2ee523a2206206994597C13D831ec7")
    FWB = await ethers.getContractAt(ERC20.abi, "0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")

    await acquireToken(DAI_WHALE, deployer, DAI, "1000")
    await acquireToken(USDC_WHALE, deployer, USDC, "1000")
    await acquireToken(USDT_WHALE, deployer, USDT, "1000")
    await acquireToken(FWB_WHALE, deployer, FWB, "1000")

    const distributorFactory = await ethers.getContractFactory('AirdropPush')
    distributor = await distributorFactory.connect(deployer).deploy();
    await distributor.deployed()
  });

  describe("Test Distributions", async () => {
    it("Test distribute distribute to users", async () => {
      await FWB.connect(deployer).approve(distributor.address, 30)
      await distributor.connect(deployer).distribute(
        FWB.address,
        [randomUser1.address, randomUser2.address, randomUser3.address],
        [10, 10, 10]
      )

      const user1Bal = await FWB.connect(randomUser1).balanceOf(randomUser1.address)
      expect(user1Bal).to.equal(10)
      const user2Bal = await FWB.connect(randomUser2).balanceOf(randomUser2.address)
      expect(user2Bal).to.equal(10)
      const user3Bal = await FWB.connect(randomUser3).balanceOf(randomUser3.address)
      expect(user3Bal).to.equal(10)
    })

    it("Test distribute distribute to users DAI", async () => {
      const deployerBalBefore = await DAI.connect(deployer).balanceOf(deployer.address)
      await DAI.approve(distributor.address, 30)
      await distributor.connect(deployer).distribute(
        DAI.address,
        [randomUser1.address, randomUser2.address, randomUser3.address],
        [10, 10, 10]
      )

      const user1Bal = await DAI.connect(randomUser1).balanceOf(randomUser1.address)
      expect(user1Bal).to.equal(10)
      const user2Bal = await DAI.connect(randomUser2).balanceOf(randomUser2.address)
      expect(user2Bal).to.equal(10)
      const user3Bal = await DAI.connect(randomUser3).balanceOf(randomUser3.address)
      expect(user3Bal).to.equal(10)
    })

    it("Test distribute distribute to users USDC", async () => {
      await USDC.approve(distributor.address, 30)
      await distributor.connect(deployer).distribute(
        USDC.address,
        [randomUser1.address, randomUser2.address, randomUser3.address],
        [10, 10, 10]
      )

      const user1Bal = await USDC.connect(randomUser1).balanceOf(randomUser1.address)
      expect(user1Bal).to.equal(10)
      const user2Bal = await USDC.connect(randomUser2).balanceOf(randomUser2.address)
      expect(user2Bal).to.equal(10)
      const user3Bal = await USDC.connect(randomUser3).balanceOf(randomUser3.address)
      expect(user3Bal).to.equal(10)
    })

    it("Test distribute distribute to users USDT", async () => {
      await USDT.approve(distributor.address, 30)
      await distributor.connect(deployer).distribute(
        USDT.address,
        [randomUser1.address, randomUser2.address, randomUser3.address],
        [10, 10, 10]
      )

      const user1Bal = await USDT.connect(randomUser1).balanceOf(randomUser1.address)
      expect(user1Bal).to.equal(10)
      const user2Bal = await USDT.connect(randomUser2).balanceOf(randomUser2.address)
      expect(user2Bal).to.equal(10)
      const user3Bal = await USDT.connect(randomUser3).balanceOf(randomUser3.address)
      expect(user3Bal).to.equal(10)
    })
  })
});
