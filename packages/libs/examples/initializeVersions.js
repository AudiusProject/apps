const Web3 = require('../src/LibsWeb3')
const AudiusLibs = require('../src/index')
const serviceTypeList = ['discovery-node', 'content-node']
const dataWeb3ProviderEndpoint = 'https://sokol.poa.network:443'
const ethWeb3ProviderEndpoint = process.env.ETH_WEB3_PROVIDER_ENDPOINT
const dataRegistryAddress = '0x09033761774Fe45F40A47191DdF873F18B62DE05'
const ethRegistryAddress = '0xB631ABAA63a26311366411b2025F0cAca00DE27F'
const ethTokenAddress = '0xF8e679Aa54361467B12c7394BFF57Eb890f6d934'
let latestVersionStr = '0.1.0'

const isServer = true

const getEnv = (env) => {
  const value = process.env[env]
  if (typeof value === 'undefined') {
    console.log(`${env} has not been set.`)
    return null
  }
  return value
}

/*
 *
 * export AUDIUS_PRIVATE_KEY=
   export AUDIUS_OWNER_WALLET=
 * */

async function initializeVersionServiceProviderContracts() {
  let audiusLibsConfig
  let privateKey = getEnv('AUDIUS_PRIVATE_KEY')
  let ownerWallet = getEnv('AUDIUS_OWNER_WALLET')
  if (!privateKey || !ownerWallet) {
    throw new Error('Missing private key or owner wallet')
  }
  console.log('Querying environment variables:')
  console.log(privateKey)
  console.log(ownerWallet)

  const dataWeb3 = new Web3(
    new Web3.providers.HttpProvider(dataWeb3ProviderEndpoint)
  )
  let web3DataContractConfig = {
    registryAddress: dataRegistryAddress,
    useExternalWeb3: true,
    externalWeb3Config: {
      web3: dataWeb3,
      ownerWallet: ownerWallet
    }
  }

  const ethWeb3 = new Web3(
    new Web3.providers.HttpProvider(ethWeb3ProviderEndpoint)
  )
  audiusLibsConfig = {
    web3Config: web3DataContractConfig,
    ethWeb3Config: AudiusLibs.configEthWeb3(
      ethTokenAddress, // Token Address
      ethRegistryAddress,
      ethWeb3,
      ownerWallet
    ),
    discoveryProviderConfig: {},
    isServer: isServer
  }
  let audiusLibs = new AudiusLibs(audiusLibsConfig)
  console.log('Initializing...')
  await audiusLibs.init()

  console.log('----version init---')
  let testTx = null

  /*
  for (const serviceType of serviceTypeList) {
    console.log(`\nregistering ${serviceType}`)
    try {
      testTx = await audiusLibs.ethContracts.ServiceTypeManagerClient.setServiceVersion(
        serviceType,
        latestVersionStr,
        privateKey)
      console.log(testTx)
    } catch (e) {
      if (!e.toString().includes('Already registered')) {
        console.log(e)
      } else {
        console.log('Already registered')
      }
    }
  }
  */
  for (const serviceType of serviceTypeList) {
    let versionTx =
      await audiusLibs.ethContracts.ServiceTypeManagerClient.getCurrentVersion(
        serviceType
      )
    let numVersionsTx =
      await audiusLibs.ethContracts.ServiceTypeManagerClient.getNumberOfVersions(
        serviceType
      )
    console.log(
      `${serviceType} | current version: ${versionTx} | number of versions : ${numVersionsTx}`
    )
  }

  console.log('/----version init---')
}

initializeVersionServiceProviderContracts()
