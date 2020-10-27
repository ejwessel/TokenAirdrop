const { ethers, artifacts, contract } = require("@nomiclabs/buidler");
const {
  BN,
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const timeMachine = require("ganache-time-traveler");
const MockContract = artifacts.require("MockContract");
const ERC20 = new ethers.utils.Interface(artifacts.require("ERC20").abi);
const AirdropPull712 = artifacts.require("AirdropPull712");
const SIGNER = process.env.ACCOUNT_1
const ROTATED_SIGNER = process.env.ACCOUNT_2
const DEV_CHAIN_ID = 31337

async function generateSignature(key, contract, recipient, amount, chain = DEV_CHAIN_ID) {
  const domain = {
    name: 'Airdrop Signature',
    version: '1',
    chainId: chain,
    verifyingContract: contract
  }
  const types = {
    Recipient: [
      { name: 'wallet', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ]
  }
  const data = {
    wallet: recipient,
    amount: amount
  }

  // const provider = ethers.getDefaultProvider('mainnet', { projectId: process.env.INFURA_API_KEY })
  const provider = ethers.provider
  const wallet = new ethers.Wallet(key, provider)
  let signature = await wallet._signTypedData(domain, types, data)
  signature = signature.slice(2)
  const r = "0x" + signature.substring(0, 64);
  const s = "0x" + signature.substring(64, 128);
  const v = parseInt(signature.substring(128, 130), 16);
  return { r, s, v }
}

contract("AirdropPull712 Unit Test", async (accounts) => {
  const [owner, recipient1, recipient2] = accounts;

  let rewardDistributor;
  let mockToken;
  let snapshotId;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    mockToken = await MockContract.new();
    rewardDistributor = await AirdropPull712.new(mockToken.address, SIGNER, { from: owner });
  });

  describe("Test Constructor", async () => {
    it("Test Invalid Token Address", async () => {
      await expectRevert(AirdropPull712.new(ZERO_ADDRESS, SIGNER, { from: owner }), "Invalid Token")
    })

    it("Test Invalid Signer Address", async () => {
      await expectRevert(AirdropPull712.new(mockToken.address, ZERO_ADDRESS, { from: owner }), "Invalid Signer Address")
    })
  })

  describe("Test Defaults", async () => {
    it("Test APY Contract set", async () => {
      const tokenAddress = await rewardDistributor.token.call()
      assert.equal(tokenAddress, mockToken.address)
    })

    it("Test Signer set", async () => {
      const signerAddress = await rewardDistributor.signer.call()
      assert.equal(signerAddress, SIGNER)
    })

    it("Test Owner is set", async () => {
      const ownerAddress = await rewardDistributor.owner.call()
      assert(ownerAddress, owner)
    })
  })

  describe("Test Setters", async () => {
    it("Test setting signer by not owner", async () => {
      await expectRevert.unspecified(rewardDistributor.setSigner(ROTATED_SIGNER, { from: recipient1 }))
    })

    it("Test setting signer", async () => {
      await rewardDistributor.setSigner(ROTATED_SIGNER, { from: owner })
      const newSigner = await rewardDistributor.signer.call()
      assert(newSigner, ROTATED_SIGNER)
    })
  })

  describe("Test Claiming", async () => {
    it("Test Signature mismatch", async () => {
      const { r, s, v } = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, 1)

      const recipientData = [recipient1, 2]
      await expectRevert(rewardDistributor.claim(recipientData, v, r, s, { from: recipient1 }), "Invalid Signature")
    });

    it("Test claiming more than available balance of contract", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount - 1)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      await expectRevert(rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 }), "Insufficient Funds")
    });

    it("Test claiming for another user", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]

      // another recipient claims
      await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient2 })
    });

    it("Test all funds can be removed from contract", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 })
    });

    it("Test claiming when signer changes", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 })

      await rewardDistributor.setSigner(ROTATED_SIGNER, { from: owner })

      const sig2 = await generateSignature(process.env.ACCOUNT_2_PRIV, rewardDistributor.address, recipient1, amount)
      recipientData = [recipient1, amount]
      await rewardDistributor.claim(recipientData, sig2.v, sig2.r, sig2.s, { from: recipient1 })
    });

    it("Test Claim event is emitted", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      const trx = await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 })

      expectEvent(trx, "Claimed", { wallet: recipient1, amount: new BN(amount) })
    });

    it.skip("Test reuse of signature", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 })

      await expectRevert(rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 }), "Nonce Mismatch")
    })

    it("Test successful signature and valid transfer", async () => {
      const amount = 10
      const transfer = await ERC20.encodeFunctionData('transfer', [recipient1, amount])
      await mockToken.givenMethodReturnBool(transfer, true)

      const balanceOf = await ERC20.encodeFunctionData('balanceOf', [recipient1])
      await mockToken.givenMethodReturnUint(balanceOf, amount)

      const sig1 = await generateSignature(process.env.ACCOUNT_1_PRIV, rewardDistributor.address, recipient1, amount)
      let recipientData = [recipient1, amount]
      await rewardDistributor.claim(recipientData, sig1.v, sig1.r, sig1.s, { from: recipient1 })

      const invocationCount = await mockToken.invocationCountForMethod.call(transfer)
      assert.equal(invocationCount, 1)
    })
  });
});