const AudiusLibs = require('@audius/libs')

const config = require('./config')
const registryAddress = config.get('registryAddress')
const web3ProviderUrl = config.get('web3Provider')

async function initAudiusLibs () {
  const dataWeb3 = await AudiusLibs.Utils.configureWeb3(web3ProviderUrl, null, false)
  if (!dataWeb3) throw new Error('Web3 incorrectly configured')

  let audiusInstance = new AudiusLibs({
    discoveryProviderConfig: AudiusLibs.configDiscoveryProvider(
      /** autoSelect */ false,
      /** whiteist */ new Set([config.get('notificationDiscoveryProvider')])
    ),
    ethWeb3Config: AudiusLibs.configEthWeb3(
      config.get('ethTokenAddress'),
      config.get('ethRegistryAddress'),
      config.get('ethProviderUrl'),
      config.get('ethOwnerWallet')
    ),
    web3Config: {
      registryAddress,
      useExternalWeb3: true,
      externalWeb3Config: {
        web3: dataWeb3,
        // this is a stopgap since libs external web3 init requires an ownerWallet
        // this is never actually used in the service's libs calls
        ownerWallet: config.get('relayerPublicKey')
      }
    },
    isServer: true
  })

  await audiusInstance.init()
  return audiusInstance
}

module.exports = initAudiusLibs
