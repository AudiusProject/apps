const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
require('dotenv').config()

if (process.argv.length < 3) {
  console.error('Usage: node configureEnv.cjs <stage|prod|dev>')
  process.exit(1)
}
const env = process.argv[2]
if (!(env === 'stage' || env === 'prod' || env === 'dev')) {
  console.error(
    "Invalid environment arg. Please use 'stage', 'prod', or 'dev'."
  )
  process.exit(1)
}

const CONFIGURED_ENV_FILE = `.env.${env}.local`
if (env === 'stage' || env === 'prod') {
  try {
    const ENV_FILE = `.env.${env}`

    const parsedEnv = dotenv.config({
      path: path.join(__dirname, '..', ENV_FILE)
    })

    if (parsedEnv.error) {
      throw parsedEnv.error
    }

    let envString = Object.entries(parsedEnv.parsed)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const VITE_DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || './'
    envString += `\nVITE_DASHBOARD_BASE_URL=${VITE_DASHBOARD_BASE_URL}`
    console.log(`Protocol dashboard base path: ${VITE_DASHBOARD_BASE_URL}`)

    const configuredEnv = path.join(__dirname, '..', CONFIGURED_ENV_FILE)
    fs.writeFile(configuredEnv, envString, (err) => {
      if (err) {
        console.error(err)
      }
      console.log(`Successfully configured ${CONFIGURED_ENV_FILE}`)
    })
  } catch (e) {
    console.error(`Could not configure ${env} env:`, e)
  }
} else if (env === 'dev') {
  const AUDIUS_CONFIG = '.audius/config.json'
  const AUDIUS_ETH_CONFIG = '.audius/eth-config.json'
  const AUDIUS_SOL_CONFIG = '.audius/solana-program-config.json'

  const homeDir = require('os').homedir()
  try {
    const configFile = require(path.join(homeDir, AUDIUS_CONFIG))
    const ethConfigFile = require(path.join(homeDir, AUDIUS_ETH_CONFIG))
    const solConfigFile = require(path.join(homeDir, AUDIUS_SOL_CONFIG))
    console.log(configFile)
    console.log(ethConfigFile)
    console.log(solConfigFile)

    const remoteHost = process.env.AUDIUS_REMOTE_DEV_HOST
    const localhost = '0.0.0.0'
    const useRemoteHost =
      remoteHost && process.argv.length > 3 && process.argv[3] === 'remote'
    const host = useRemoteHost ? remoteHost : localhost

    const VITE_DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || './'
    const VITE_ENVIRONMENT = 'development'
    const VITE_CONTENT_NODE = `http://${host}:4000`
    const VITE_DISCOVERY_PROVIDER = `http://${host}:5000`
    const VITE_IDENTITY_SERVICE = `http://${host}:7000`
    const VITE_IPFS_GATEWAY = `http://${host}:8080/ipfs/`

    const VITE_REGISTRY_ADDRESS = configFile.registryAddress
    const VITE_WEB3_PROVIDER_URL = `http://${host}:8545`
    const VITE_OWNER_WALLET = configFile.ownerWallet

    const VITE_ETH_REGISTRY_ADDRESS = ethConfigFile.registryAddress
    const VITE_ETH_PROVIDER_URL = `http://${host}:8546`
    const VITE_ETH_TOKEN_ADDRESS = ethConfigFile.audiusTokenAddress
    const VITE_ETH_OWNER_WALLET = ethConfigFile.ownerWallet
    const VITE_ETH_NETWORK_ID = 1337

    const VITE_CLAIMABLE_TOKEN_PROGRAM_ADDRESS =
      solConfigFile.claimableTokenAddress
    const VITE_REWARDS_MANAGER_PROGRAM_ID = solConfigFile.rewardsManagerAddress
    const VITE_REWARDS_MANAGER_PROGRAM_PDA = solConfigFile.rewardsManagerAccount
    const VITE_REWARDS_MANAGER_TOKEN_PDA =
      solConfigFile.rewardsManagerTokenAccount
    const VITE_SOLANA_TOKEN_PROGRAM_ADDRESS =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    const VITE_SOLANA_WEB3_CLUSTER = 'devnet'
    const VITE_SOLANA_CLUSTER_ENDPOINT = `http://${host}:8899`
    const VITE_WAUDIO_MINT_ADDRESS = solConfigFile.splToken
    const VITE_SOLANA_FEE_PAYER_ADDRESS = solConfigFile.feePayerWalletPubkey

    const VITE_AUDIUS_URL = `http://${host}:3000`
    const VITE_GQL_URI = `http://${host}:8000/subgraphs/name/AudiusProject/audius-subgraph`

    const VITE_IDENTITY_SERVICE_ENDPOINT = `http://${host}:7000`

    const contents = `
    # DO NOT MODIFY. SEE /scripts/configureEnv.cjs
    
    VITE_DASHBOARD_BASE_URL=${VITE_DASHBOARD_BASE_URL}
    VITE_ENVIRONMENT=${VITE_ENVIRONMENT}
    
    VITE_DISCOVERY_PROVIDER=${VITE_DISCOVERY_PROVIDER}
    VITE_CONTENT_NODE=${VITE_CONTENT_NODE}
    VITE_IDENTITY_SERVICE=${VITE_IDENTITY_SERVICE}
    VITE_IPFS_GATEWAY=${VITE_IPFS_GATEWAY}
    
    VITE_REGISTRY_ADDRESS=${VITE_REGISTRY_ADDRESS}
    VITE_WEB3_PROVIDER_URL=${VITE_WEB3_PROVIDER_URL}

    VITE_OWNER_WALLET=${VITE_OWNER_WALLET}

    VITE_ETH_REGISTRY_ADDRESS=${VITE_ETH_REGISTRY_ADDRESS}
    VITE_ETH_PROVIDER_URL=${VITE_ETH_PROVIDER_URL}
    VITE_ETH_TOKEN_ADDRESS=${VITE_ETH_TOKEN_ADDRESS}
    VITE_ETH_OWNER_WALLET=${VITE_ETH_OWNER_WALLET}
    VITE_ETH_NETWORK_ID=${VITE_ETH_NETWORK_ID}

    VITE_CLAIMABLE_TOKEN_PROGRAM_ADDRESS=${VITE_CLAIMABLE_TOKEN_PROGRAM_ADDRESS}
    VITE_SOLANA_TOKEN_PROGRAM_ADDRESS=${VITE_SOLANA_TOKEN_PROGRAM_ADDRESS}
    VITE_SOLANA_CLUSTER_ENDPOINT=${VITE_SOLANA_CLUSTER_ENDPOINT}
    VITE_SOLANA_WEB3_CLUSTER=${VITE_SOLANA_WEB3_CLUSTER}
    VITE_WAUDIO_MINT_ADDRESS=${VITE_WAUDIO_MINT_ADDRESS}
    VITE_SOLANA_FEE_PAYER_ADDRESS=${VITE_SOLANA_FEE_PAYER_ADDRESS}
    VITE_REWARDS_MANAGER_PROGRAM_ID=${VITE_REWARDS_MANAGER_PROGRAM_ID}
    VITE_REWARDS_MANAGER_PROGRAM_PDA=${VITE_REWARDS_MANAGER_PROGRAM_PDA}
    VITE_REWARDS_MANAGER_TOKEN_PDA=${VITE_REWARDS_MANAGER_TOKEN_PDA}

    VITE_AUDIUS_URL=${VITE_AUDIUS_URL}
    VITE_GQL_URI=${VITE_GQL_URI}

    VITE_IDENTITY_SERVICE_ENDPOINT=${VITE_IDENTITY_SERVICE_ENDPOINT}
    `

    fs.writeFile(CONFIGURED_ENV_FILE, contents, (err) => {
      if (err) {
        console.error(err)
      }
      console.log(`Successfully configured ${CONFIGURED_ENV_FILE}`)
    })
  } catch (e) {
    console.error(
      `
      Did not find configuration file.
      See https://github.com/AudiusProject/audius-e2e-tests to configure a local dev environment.
    `,
      e
    )
  }
}
