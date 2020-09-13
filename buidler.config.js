require('dotenv').config()
usePlugin('@nomiclabs/buidler-ethers')
usePlugin('@nomiclabs/buidler-truffle5')


const privateKey = process.env.PRIVATE_KEY

module.exports = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      timeout: 1000000,
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY,
      // gasPrice: 139e9,
      timeout: 1000000,
      accounts: privateKey ? [privateKey] : undefined,
    },
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: '0.6.10',
    optimizer: {
      enabled: true,
      runs: 2000,
    },
  },
  mocha: {
    timeout: 1000000,
  },
}
