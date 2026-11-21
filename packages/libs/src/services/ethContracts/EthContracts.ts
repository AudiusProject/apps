import semver from 'semver'
import type { AbiItem } from 'web3-utils'

import { abi as ClaimDistributionABI } from '../../eth-contracts/ABIs/AudiusClaimDistributor.json'
import { abi as AudiusTokenABI } from '../../eth-contracts/ABIs/AudiusToken.json'
import { abi as ClaimsManagerABI } from '../../eth-contracts/ABIs/ClaimsManager.json'
import { abi as DelegateManagerABI } from '../../eth-contracts/ABIs/DelegateManagerV2.json'
import { abi as EthRewardsManagerABI } from '../../eth-contracts/ABIs/EthRewardsManager.json'
import { abi as GovernanceABI } from '../../eth-contracts/ABIs/Governance.json'
import { abi as RegistryABI } from '../../eth-contracts/ABIs/Registry.json'
import { abi as ServiceProviderFactoryABI } from '../../eth-contracts/ABIs/ServiceProviderFactory.json'
import { abi as ServiceTypeManagerABI } from '../../eth-contracts/ABIs/ServiceTypeManager.json'
import { abi as StakingABI } from '../../eth-contracts/ABIs/Staking.json'
import { abi as TrustedNotifierManagerABI } from '../../eth-contracts/ABIs/TrustedNotifierManager.json'
import { abi as WormholeClientABI } from '../../eth-contracts/ABIs/WormholeClient.json'
import type { Logger } from '../../utils'
import type { ContractClient } from '../contracts/ContractClient'
import type { EthWeb3Manager } from '../ethWeb3Manager'

import { AudiusTokenClient } from './AudiusTokenClient'
import { ClaimDistributionClient } from './ClaimDistributionClient'
import { ClaimsManagerClient } from './ClaimsManagerClient'
import { DelegateManagerClient } from './DelegateManagerClient'
import { EthRewardsManagerClient } from './EthRewardsManagerClient'
import { GovernanceClient } from './GovernanceClient'
import { RegistryClient } from './RegistryClient'
import { ServiceProviderFactoryClient } from './ServiceProviderFactoryClient'
import { ServiceTypeManagerClient } from './ServiceTypeManagerClient'
import { StakingProxyClient } from './StakingProxyClient'
import { TrustedNotifierManagerClient } from './TrustedNotifierManagerClient'
import { WormholeClient } from './WormholeClient'

const GovernanceRegistryKey = 'Governance'
const ServiceTypeManagerProxyKey = 'ServiceTypeManagerProxy'
const ServiceProviderFactoryRegistryKey = 'ServiceProviderFactory'
const StakingProxyKey = 'StakingProxy'
const DelegateManagerRegistryKey = 'DelegateManager'
const ClaimsManagerProxyKey = 'ClaimsManagerProxy'
const ClaimDistributionRegistryKey = 'ClaimDistribution'
const EthRewardsManagerProxyKey = 'EthRewardsManagerProxy'
const TrustedNotifierManagerProxyKey = 'TrustedNotifierManagerProxy'

const TWO_MINUTES = 2 * 60 * 1000

export const serviceType = Object.freeze({
  DISCOVERY_PROVIDER: 'discovery-node',
  CREATOR_NODE: 'content-node'
})
const serviceTypeList = Object.values(serviceType)

export type EthContractsConfig = {
  ethWeb3Manager: EthWeb3Manager
  tokenContractAddress: string
  registryAddress: string
  claimDistributionContractAddress: string
  wormholeContractAddress: string
  isServer?: boolean
  logger?: Logger
  isDebug?: boolean
}

export class EthContracts {
  ethWeb3Manager: EthWeb3Manager
  tokenContractAddress: string
  claimDistributionContractAddress: string
  wormholeContractAddress: string
  registryAddress: string
  isServer: boolean
  logger: Logger
  isDebug: boolean
  expectedServiceVersions: null | string[]
  AudiusTokenClient: AudiusTokenClient
  RegistryClient: RegistryClient
  StakingProxyClient: StakingProxyClient
  GovernanceClient: GovernanceClient
  ClaimsManagerClient: ClaimsManagerClient
  EthRewardsManagerClient: EthRewardsManagerClient
  ServiceTypeManagerClient: ServiceTypeManagerClient
  ServiceProviderFactoryClient: ServiceProviderFactoryClient
  DelegateManagerClient: DelegateManagerClient
  ClaimDistributionClient: ClaimDistributionClient | undefined
  WormholeClient: WormholeClient
  TrustedNotifierManagerClient: TrustedNotifierManagerClient
  contractClients: ContractClient[]
  _regressedMode: boolean
  contracts: Record<string, string> | undefined
  contractAddresses: Record<string, string> | undefined

  constructor({
    ethWeb3Manager,
    tokenContractAddress,
    registryAddress,
    claimDistributionContractAddress,
    wormholeContractAddress,
    isServer = false,
    logger = console,
    isDebug = false
  }: EthContractsConfig) {
    this.ethWeb3Manager = ethWeb3Manager
    this.tokenContractAddress = tokenContractAddress
    this.claimDistributionContractAddress = claimDistributionContractAddress
    this.wormholeContractAddress = wormholeContractAddress
    this.registryAddress = registryAddress
    this.isServer = isServer
    this.logger = logger
    this.isDebug = isDebug
    this.expectedServiceVersions = null

    this.AudiusTokenClient = new AudiusTokenClient(
      this.ethWeb3Manager,
      AudiusTokenABI as AbiItem[],
      this.tokenContractAddress
    )
    this.RegistryClient = new RegistryClient(
      this.ethWeb3Manager,
      RegistryABI as AbiItem[],
      this.registryAddress
    )
    this.getRegistryAddressForContract =
      this.getRegistryAddressForContract.bind(this)

    this.StakingProxyClient = new StakingProxyClient(
      this.ethWeb3Manager,
      StakingABI as AbiItem[],
      StakingProxyKey,
      this.getRegistryAddressForContract,
      this.AudiusTokenClient,
      this.logger
    )

    this.GovernanceClient = new GovernanceClient(
      this.ethWeb3Manager,
      GovernanceABI as AbiItem[],
      GovernanceRegistryKey,
      this.getRegistryAddressForContract,
      this.AudiusTokenClient,
      this.StakingProxyClient,
      this.logger
    )

    this.ClaimsManagerClient = new ClaimsManagerClient(
      this.ethWeb3Manager,
      ClaimsManagerABI as AbiItem[],
      ClaimsManagerProxyKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.EthRewardsManagerClient = new EthRewardsManagerClient(
      this.ethWeb3Manager,
      EthRewardsManagerABI as AbiItem[],
      EthRewardsManagerProxyKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.ServiceTypeManagerClient = new ServiceTypeManagerClient(
      this.ethWeb3Manager,
      ServiceTypeManagerABI as AbiItem[],
      ServiceTypeManagerProxyKey,
      this.getRegistryAddressForContract,
      this.GovernanceClient,
      this.logger
    )

    this.ServiceProviderFactoryClient = new ServiceProviderFactoryClient(
      this.ethWeb3Manager,
      ServiceProviderFactoryABI as AbiItem[],
      ServiceProviderFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.AudiusTokenClient,
      this.StakingProxyClient,
      this.GovernanceClient,
      this.logger,
      this.isDebug
    )

    this.DelegateManagerClient = new DelegateManagerClient(
      this.ethWeb3Manager,
      DelegateManagerABI as AbiItem[],
      DelegateManagerRegistryKey,
      this.getRegistryAddressForContract,
      this.AudiusTokenClient,
      this.StakingProxyClient,
      this.GovernanceClient,
      this.logger
    )

    if (this.claimDistributionContractAddress) {
      this.ClaimDistributionClient = new ClaimDistributionClient(
        this.ethWeb3Manager,
        ClaimDistributionABI as AbiItem[],
        ClaimDistributionRegistryKey,
        this.getRegistryAddressForContract,
        this.logger,
        this.claimDistributionContractAddress
      )
    }

    this.WormholeClient = new WormholeClient(
      this.ethWeb3Manager,
      WormholeClientABI as AbiItem[],
      this.wormholeContractAddress,
      this.AudiusTokenClient
    )

    this.TrustedNotifierManagerClient = new TrustedNotifierManagerClient(
      this.ethWeb3Manager,
      TrustedNotifierManagerABI as AbiItem[],
      TrustedNotifierManagerProxyKey,
      this.getRegistryAddressForContract,
      this.GovernanceClient,
      this.logger
    )

    this.contractClients = [
      this.ServiceTypeManagerClient,
      this.StakingProxyClient,
      this.ServiceProviderFactoryClient
    ]

    this._regressedMode = false
  }

  async init() {
    if (
      !this.ethWeb3Manager ||
      !this.tokenContractAddress ||
      !this.registryAddress
    )
      throw new Error('Failed to initialize EthContracts')

    if (this.isServer) {
      await Promise.all(
        this.contractClients.map(async (client) => await client.init())
      )
    }
  }

  enterRegressedMode() {
    console.info('Entering regressed mode')
    this._regressedMode = true
    setTimeout(() => {
      console.info('Leaving regressed mode')
      this._regressedMode = false
    }, TWO_MINUTES)
  }

  isInRegressedMode() {
    return this._regressedMode
  }

  async getRegistryAddressForContract(contractName: string) {
    this.contracts = this.contracts ?? { [this.registryAddress]: 'registry' }
    this.contractAddresses = this.contractAddresses ?? {
      registry: this.registryAddress
    }
    if (!this.contractAddresses[contractName]) {
      const address = await this.RegistryClient.getContract(contractName)
      this.contracts[address] = contractName
      this.contractAddresses[contractName] = address
    }

    return this.contractAddresses[contractName] as string
  }

  async getCurrentVersion(serviceType: string) {
    try {
      const version =
        await this.ServiceTypeManagerClient.getCurrentVersion(serviceType)
      return version
    } catch (e) {
      console.info(`Error retrieving version for ${serviceType}`)
      return ''
    }
  }

  async getExpectedServiceVersions() {
    const versions = await Promise.all(
      serviceTypeList.map(
        async (serviceType) => await this.getCurrentVersion(serviceType)
      )
    )
    const expectedVersions = serviceTypeList.reduce<
      Record<string, string | null | undefined>
    >((map, serviceType, i) => {
      if (versions[i]) {
        map[serviceType] = versions[i]
      }
      return map
    }, {})
    return expectedVersions
  }

  isValidSPVersion(version1: string, version2: string) {
    return (
      semver.major(version1) === semver.major(version2) &&
      semver.minor(version1) === semver.minor(version2) &&
      semver.patch(version2) >= semver.patch(version1)
    )
  }

  async getServiceProviderList(spType: string) {
    return await this.ServiceProviderFactoryClient.getServiceProviderList(
      spType
    )
  }

  async getNumberOfVersions(spType: string) {
    return await this.ServiceTypeManagerClient.getNumberOfVersions(spType)
  }

  async getVersion(spType: string, queryIndex: number) {
    return await this.ServiceTypeManagerClient.getVersion(spType, queryIndex)
  }

  async getServiceTypeInfo(spType: string) {
    return await this.ServiceTypeManagerClient.getServiceTypeInfo(spType)
  }
}

export const isVersionAtLeastSameMajorMinor = (
  version1: string,
  version2: string
) => {
  const version1MajorMinor = `${semver.major(version1)}.${semver.minor(
    version1
  )}.0`
  const version2MajorMinor = `${semver.major(version2)}.${semver.minor(
    version2
  )}.0`
  return semver.gte(version2MajorMinor, version1MajorMinor)
}
