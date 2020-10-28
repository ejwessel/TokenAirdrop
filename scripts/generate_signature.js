require("dotenv").config();
const { program } = require("commander");
const { ethers } = require("@nomiclabs/buidler");

async function generateSignature(
  key,
  domainName,
  contract,
  nonce,
  recipient,
  amount,
  chain
) {
  const domain = {
    name: domainName,
    version: "1",
    chainId: chain,
    verifyingContract: contract,
  };
  const types = {
    Recipient: [
      { name: "nonce", type: "uint256" },
      { name: "wallet", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  };
  const data = {
    nonce: nonce,
    wallet: recipient,
    amount: amount,
  };

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(key, provider);
  let signature = await wallet._signTypedData(domain, types, data);
  signature = signature.slice(2);
  const r = "0x" + signature.substring(0, 64);
  const s = "0x" + signature.substring(64, 128);
  const v = parseInt(signature.substring(128, 130), 16);
  return { r, s, v };
}

async function main() {
  program.version("0.0.1");
  program
    .requiredOption("-c, --contract <address>", "Target APY contract")
    .requiredOption("-n, --nonce <numbrer>", "Current nonce for recipient")
    .requiredOption("-r, --recipient <address>", "Recipient to recieve funds")
    .requiredOption(
      "-a, --amount <number>",
      "Amount the recipient can withdraw"
    )
    .option("-d, --domain <string>", "Target Domain", "Airdrop Signature")
    .option("-i, --id <number>", "Target Chain Id", "1");
  program.parse(process.argv);

  const sig = await generateSignature(
    process.env.SIGNER,
    program.domain,
    program.contract,
    program.nonce,
    program.recipient,
    program.amount,
    program.id
  );
  console.log(sig);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });