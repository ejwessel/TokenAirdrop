const { ethers } = require("@nomiclabs/buidler");
const { BN, constants } = require("@openzeppelin/test-helpers");

async function main() {
  const ERC20 = await ethers.getContractFactory("ERC20")
  const FWB = await ERC20.attach("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")

  const TokenBatchDistributor = await ethers.getContractFactory("TokenBatchDistributor");
  const distributor = await TokenBatchDistributor.deploy();

  // deploy the distributor
  await distributor.deployed();
  console.log(`Distributor Address: ${distributor.address}`)

  // approve this contract to move funds (max amount)
  await FWB.approve(distributor.address, constants.MAX_UINT256)
  console.log("Funds Approved")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
