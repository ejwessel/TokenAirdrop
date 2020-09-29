require('dotenv').config()
const { ethers } = require("ethers");
const Airdrop = artifacts.require("Airdrop");
const MockContract = artifacts.require("MockContract");
const ERC20 = new ethers.utils.Interface(artifacts.require("ERC20").abi);
const { BN, expectEvent } = require("@openzeppelin/test-helpers");

contract("Airdrop", async (accounts) => {
  const [owner, recipient] = accounts;

  let airdrop;
  let mockToken;

  beforeEach(async () => {
    airdrop = await Airdrop.new({ from: owner });
    mockToken = await MockContract.new();
  });

  it("Test Signature Airdrop works", async () => {
    // .env PRIVATE_KEY is set to owner private key
    const privKey = process.env.PRIVATE_KEY
    const amount = 1000;
    const wallet = new ethers.Wallet(privKey)
    const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [mockToken.address, recipient, amount])
    const message = ethers.utils.arrayify(hash)
    const signature = await wallet.signMessage(message)

    const transfer = await ERC20.encodeFunctionData('transfer', [recipient, amount])
    await mockToken.givenMethodReturnBool(transfer, true)

    const trx = await airdrop.claim(mockToken.address, recipient, amount, signature);

    const invocationCount = await mockToken.invocationCountForMethod.call(transfer)
    assert.equal(invocationCount, 1)

    await expectEvent(trx, 'Claimed', { token: mockToken.address, recipient: recipient, amount: new BN(amount) })
  });
});
