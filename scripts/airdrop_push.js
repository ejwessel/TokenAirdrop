const { ethers, artifacts } = require("hardhat");
const BN = ethers.BigNumber
const { MaxUint256 } = ethers.constants
const ERC20 = artifacts.require("ERC20");
var _ = require('lodash')

// method is used to account for the decimal placement that token has
function amount(decimals, value) {
  return (BN.from("10").pow(BN.from(decimals))).mul(BN.from(value))
}

async function main() {
  const [deployer] = await ethers.getSigners()

  const FWB = await ethers.getContractAt(ERC20.abi, '0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91')
  const decimals = await FWB.decimals()

  const AirdropPushFactory = await ethers.getContractFactory("AirdropPush");
  const distributor = await AirdropPushFactory.connect(deployer).deploy();
  await distributor.deployed();
  console.log(`Distributor Address: ${distributor.address}`)

  // approve funds
  await FWB.connect(deployer).approve(distributor.address, MaxUint256)
  console.log("Funds Approved")

  // Construct deployment distribution payload
  const userAmounts = [
    ['0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81', amount(decimals, 1)],
    ['0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81', amount(decimals, 1)],
  ]
  const split = _.unzip(userAmounts)
  const users = split[0]
  const amounts = split[1]

  await distributor.connect(deployer).distribute(
    FWB.address,
    users,
    amounts
  )
  console.log("Tokens Distributed")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
