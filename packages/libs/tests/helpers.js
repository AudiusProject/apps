const nock = require('nock')

const { AudiusLibs } = require('../src/AudiusLibs')
const Web3 = require('../src/LibsWeb3')
const dataContractsConfig = require('../src/data-contracts/config.json')
const ethContractsConfig = require('../src/eth-contracts/config.json')

const creatorNodeEndpoint = 'http://localhost:4000'
const discoveryProviderEndpoint = 'http://localhost:5000'
const identityServiceEndpoint = 'http://localhost:7000'
const dataWeb3ProviderEndpoint = 'http://localhost:8545'
const ethWeb3ProviderEndpoint = 'http://localhost:8546'
require('@openzeppelin/test-helpers/configure')({
  provider: ethWeb3ProviderEndpoint
})
const isServer = true

const constants = {
  trackMetadataCID: 'QmSH5gJPHg9xLzV823ty8BSGyHNP6ty22bgLsv5MLY3kBq',
  trackMetadataCID2: 'QmSH5gJPHg9xLzV823ty8BSGyHNP6ty22bgLaaaaaaaaaa',
  creatorMetadataCID: 'QmTDhoEDLE3k3CE5bu4mF1ogsEVkPwEAM41KsN7hZX1eWY',
  '0x0': '0x0000000000000000000000000000000000000000000000000000000000000000',
  creatorNodeURL1: 'http://localhost:8000/',
  creatorNodeURL2: 'http://localhost:8001/',
  signatureData: 'Click sign to authenticate with creator node:1543885912',
  signatureAddress: '0x7d267e2f8dc64c53267c56dab55bf7050566baec',
  signature:
    '0xbb3ffe5f32950ace5c0a8ecb9c43ab836b7b7146a56e2519ac1c662e9b00bdcd7de9a3f3265206c54f0b8094f8ac8832d32d5852492c1aa3e9493e28ae3a31b91b',
  wallet: '0xdfdbe819b5710b750b3a00eb2fae8a59b85c66af',
  ethContractsConfig
}

const dataWeb3 = new Web3(
  new Web3.providers.HttpProvider(dataWeb3ProviderEndpoint)
)
const ethWeb3 = new Web3(
  new Web3.providers.HttpProvider(ethWeb3ProviderEndpoint)
)

const audiusLibsConfig = {
  identityServiceConfig: {
    url: identityServiceEndpoint
  },
  web3Config: AudiusLibs.configExternalWeb3(
    dataContractsConfig.registryAddress,
    dataWeb3
  ),
  ethWeb3Config: AudiusLibs.configEthWeb3(
    ethContractsConfig.audiusTokenAddress,
    ethContractsConfig.registryAddress,
    ethWeb3,
    ethContractsConfig.ownerWallet
  ),
  isServer: true
}

async function initializeLibConfig(ownerWallet) {
  return {
    identityServiceConfig: {
      url: identityServiceEndpoint
    },
    web3Config: AudiusLibs.configExternalWeb3(
      dataContractsConfig.registryAddress,
      dataWeb3
    ),
    ethWeb3Config: AudiusLibs.configEthWeb3(
      ethContractsConfig.audiusTokenAddress,
      ethContractsConfig.registryAddress,
      ethWeb3,
      ownerWallet
    ),
    isServer: true
  }
}

const getRandomLocalhost = () => {
  return 'https://localhost:' + Math.floor(1000 + Math.random() * 9000)
}

const deregisterSPEndpoint = async (libs, account, type) => {
  const previousRegisteredId =
    await libs.ethContracts.ServiceProviderFactoryClient.getServiceProviderIdFromAddress(
      account,
      type
    )
  const prevSpInfo =
    await libs.ethContracts.ServiceProviderFactoryClient.getServiceEndpointInfo(
      type,
      previousRegisteredId
    )

  let path = '/version'
  let response = {
    service: type,
    version: '0.0.1'
  }

  if (type === 'discovery-provider') {
    path = '/health_check?allow_unregistered=true'
    response = { data: { ...response } }
  }

  nock(prevSpInfo.endpoint).get(path).reply(200, response)
  const tx = await libs.ethContracts.ServiceProviderFactoryClient.deregister(
    type,
    prevSpInfo.endpoint
  )
}

function convertAudsToWeiBN(ethWeb3, amountOfAUDS) {
  const tokenInWei = ethWeb3.utils.toWei(amountOfAUDS.toString(), 'ether')
  return ethWeb3.utils.toBN(tokenInWei)
}

module.exports = {
  constants,
  audiusInstance: new AudiusLibs(audiusLibsConfig),
  audiusLibsConfig,
  initializeLibConfig,
  getRandomLocalhost,
  deregisterSPEndpoint,
  convertAudsToWeiBN
}
