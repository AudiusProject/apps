const { exec } = require('child_process')

exec(`
docker cp $(docker ps -q -f "name=audius_ganache_cli_eth_contracts"):/app/eth-contracts-ganache-accounts.json .
`)

const accounts = require('../eth-contracts-ganache-accounts.json')
const wallets = Object.keys(accounts.addresses).slice(0, 50)
const homedir = require('os').homedir()
const audConfig = require(`${homedir}/.audius/eth-config.json`)
const tokenAddress = audConfig['audiusTokenAddress']

console.log(`Token Address is ${tokenAddress}`)
for (let w in wallets) {
  const wallet = wallets[w]
  const privateKey = Buffer.from(
    accounts.addresses[wallet.toLowerCase()].secretKey.data
  ).toString('hex')
  console.log(`${w} | Wallet: ${wallet} | Private key: ${privateKey}`)
}
