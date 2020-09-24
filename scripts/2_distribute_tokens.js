const { ethers } = require("@nomiclabs/buidler");
const { BN } = require("@openzeppelin/test-helpers");
var _ = require('lodash')

// method is used to account for the decimal placement that token has
function amount(decimals, value) {
  return ((new BN("10").pow(new BN(decimals))).mul(new BN(value))).toString()
}

async function main() {
  const ERC20 = await ethers.getContractFactory("ERC20")
  const FWB = await ERC20.attach("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")
  const decimals = await FWB.decimals()

  const TokenBatchDistributor = await ethers.getContractFactory("TokenBatchDistributor");
  const distributor = await TokenBatchDistributor.attach("0x6f699197E5CBB6CE618EC80A5C3B832fb7551BD6");

  const userAmounts = [
    ['0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81', amount(decimals, 1)],
    ['0xBA9FEc0023e6AA54D96617cDb3E5507FF20F8B81', amount(decimals, 1)],
  ]

  const split = _.unzip(userAmounts)

  const users = split[0]
  const amounts = split[1]
  await distributor.distributeTokens(
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
