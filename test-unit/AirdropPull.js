require('dotenv').config()
const { ethers } = require("ethers");
const timeMachine = require("ganache-time-traveler");
const AirdropPull = artifacts.require("AirdropPull");
const MockContract = artifacts.require("MockContract");
const ERC20 = new ethers.utils.Interface(artifacts.require("ERC20").abi);
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

contract("AirdropPull Unit Test", async (accounts) => {
  const [owner, recipient] = accounts;

  let distributor;
  let mockToken;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    distributor = await AirdropPull.new({ from: owner });
    mockToken = await MockContract.new();
  });

  describe("Test Distributions", async () => {
    it("Test Owner", async () => {
      assert.equal(await distributor.owner.call(), owner)
    })

    it("Test user claiming", async () => {
      // NOTE: .env PRIVATE_KEY is set to owner private key

      // owner of the contract signs the message of which the contract validates
      const privKey = process.env.PRIVATE_KEY
      const amount = 1000;
      const wallet = new ethers.Wallet(privKey)
      const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [mockToken.address, recipient, amount])
      const message = ethers.utils.arrayify(hash)
      const signature = await wallet.signMessage(message)

      const transfer = await ERC20.encodeFunctionData('transfer', [recipient, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const trx = await distributor.claim(mockToken.address, recipient, amount, signature);

      const invocationCount = await mockToken.invocationCountForMethod.call(transfer)
      assert.equal(invocationCount, 1)

      await expectEvent(trx, 'Claimed', { token: mockToken.address, recipient: recipient, amount: new BN(amount) })
    });

    it("Test user claiming with used signature", async () => {
      // owner of the contract signs the message of which the contract validates
      const privKey = process.env.PRIVATE_KEY
      const amount = 1000;
      const wallet = new ethers.Wallet(privKey)
      const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [mockToken.address, recipient, amount])
      const message = ethers.utils.arrayify(hash)
      const signature = await wallet.signMessage(message)

      const transfer = await ERC20.encodeFunctionData('transfer', [recipient, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      // claim with signature
      await distributor.claim(mockToken.address, recipient, amount, signature);

      // invalid with signature again
      await expectRevert(distributor.claim(mockToken.address, recipient, amount, signature), "Invalid signature");
    })

    it("Test user claiming with invalid signature", async () => {
      // owner of the contract signs the message of which the contract validates
      const privKey = process.env.INVALID_PRIVATE_KEY
      const amount = 1000;
      const wallet = new ethers.Wallet(privKey)
      const hash = ethers.utils.solidityKeccak256(['address', 'address', 'uint256'], [mockToken.address, recipient, amount])
      const message = ethers.utils.arrayify(hash)
      const signature = await wallet.signMessage(message)

      await expectRevert(distributor.claim(mockToken.address, recipient, amount, signature), "Invalid signature");
    })
  });
})
