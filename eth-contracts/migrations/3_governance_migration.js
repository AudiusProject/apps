const contractConfig = require('../contract-config.js')
const { encodeCall } = require('../utils/lib')

const Registry = artifacts.require('Registry')
const Governance = artifacts.require('Governance')
const AudiusAdminUpgradeabilityProxy = artifacts.require('AudiusAdminUpgradeabilityProxy')

const stakingProxyKey = web3.utils.utf8ToHex('StakingProxy')
const governanceKey = web3.utils.utf8ToHex('Governance')

// 48hr * 60 min/hr * 60 sec/min / ~15 sec/block = 11520 blocks
const VotingPeriod = 11520
// Required number of votes on proposal
const VotingQuorum = 1

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    const config = contractConfig[network]
    const proxyAdminAddress = config.proxyAdminAddress || accounts[10]
    const proxyDeployerAddress = config.proxyDeployerAddress || accounts[11]
    
    const registryAddress = process.env.registryAddress
    const registry = await Registry.at(registryAddress)
    
    // Deploy Governance logic and proxy contracts + register proxy
    const governance0 = await deployer.deploy(Governance, { from: proxyDeployerAddress })
    const initializeCallData = encodeCall(
      'initialize',
      ['address', 'bytes32', 'uint256', 'uint256', 'address'],
      [registry.address, stakingProxyKey, VotingPeriod, VotingQuorum, proxyDeployerAddress]
    )
    const governanceProxy = await deployer.deploy(
      AudiusAdminUpgradeabilityProxy,
      governance0.address,
      proxyAdminAddress,
      initializeCallData,
      registry.address,
      governanceKey,
      { from: proxyDeployerAddress }
    )
    await registry.addContract(governanceKey, governanceProxy.address, { from: proxyDeployerAddress })

    // Export to env for reference in future migrations
    process.env.governanceAddress = governanceProxy.address
  })
}
