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

  // ensure to move funds into the contract
  const balance = amount(decimals, 1000)
  // await FWB.transfer(distributor.address, balance)

  // create all signatures for users and amounts
  user_and_amounts = {
    '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0': { amount: amount(decimals, 10), signature: '' },
    '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b': { amount: amount(decimals, 10), signature: '' },
    '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d': { amount: amount(decimals, 10), signature: '' },
  }

  for (const [key, value] of Object.entries(user_and_amounts)) {
    value.signature = await generateSignature(process.env.PRIVATE_KEY, FWB.address, value.amount, key)
  }

  console.log(user_and_amounts)

  // NOTE:  users now go claim with provided signature similar to the following
  // await distributor.claim(FWB.address, user1, amt, signature);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
