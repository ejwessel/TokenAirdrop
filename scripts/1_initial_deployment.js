const { ethers } = require("@nomiclabs/buidler");
const { BN, constants } = require("@openzeppelin/test-helpers");
var _ = require('lodash')

function amount(decimals, value) {
  return ((new BN("10").pow(new BN(decimals))).mul(new BN(value))).toString()
}

async function main() {
  const ERC20 = await ethers.getContractFactory("ERC20")
  const FWB = await ERC20.attach("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")
  const decimals = await FWB.decimals()

  const TokenBatchDistributor = await ethers.getContractFactory("TokenBatchDistributor");
  // const distributor = await TokenBatchDistributor.attach('0x6f699197E5CBB6CE618EC80A5C3B832fb7551BD6');
  const distributor = await TokenBatchDistributor.deploy();

  // deploy the distributor
  await distributor.deployed();
  console.log(`FWB Address: ${FWB.address}`)
  console.log(`Distributor Address: ${distributor.address}`)

  // approve this contract to move funds (max amount)
  const totalSupply = await FWB.totalSupply()
  await FWB.approve(distributor.address, constants.MAX_UINT256.toString())
  console.log("Funds Approved")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
