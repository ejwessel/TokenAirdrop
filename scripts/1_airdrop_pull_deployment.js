require('dotenv').config()
const { ethers } = require("@nomiclabs/buidler");
const { BN, constants } = require("@openzeppelin/test-helpers");
var _ = require('lodash')

async function generateSignature(key, token, amt, recipient) {
  const wallet = new ethers.Wallet(key)
  const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [token, recipient, amt])
  const message = ethers.utils.arrayify(hash)
  const signature = await wallet.signMessage(message)
  return signature
}

function amount(decimals, value) {
  return ((new BN("10").pow(new BN(decimals))).mul(new BN(value))).toString()
}

async function main() {
  const ERC20 = await ethers.getContractFactory("ERC20")
  const FWB = await ERC20.attach("0x7d91e637589EC3Bb54D8213a9e92Dc6E8D12da91")
  const decimals = await FWB.decimals()

  const AirdropPull = await ethers.getContractFactory("AirdropPull");
  const distributor = await AirdropPull.deploy();

  // deploy the distributor
  await distributor.deployed();
  console.log(`FWB Address: ${FWB.address}`)
  console.log(`Distributor Address: ${distributor.address}`)

  // move funds into the contract
  const balance = amount(decimals, 1000)
  await FWB.transfer(distributor.address, balance)

  // create all signatures for users and amounts
  const signature = await generateSignature(process.env.PRIVATE_KEY, FWB.address, amount(decimals, 1000), user1)

  // NOTE:  users now go claim with provided signature similar to the following
  // await distributor.claim(FWB.address, user1, amt, signature);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
