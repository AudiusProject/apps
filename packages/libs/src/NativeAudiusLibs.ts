import type { Hedgehog as HedgehogBase } from '@audius/hedgehog'
import { Keypair } from '@solana/web3.js'
import type { provider } from 'web3-core'

import Web3 from './LibsWeb3'
import { Account } from './api/Account'
import { File } from './api/File'
import { Notifications } from './api/Notifications'
import { Playlists } from './api/Playlist'
import { Reactions } from './api/Reactions'
import { Rewards } from './api/Rewards'
import { ServiceProvider } from './api/ServiceProvider'
import { Track } from './api/Track'
import { Users } from './api/Users'
import type { BaseConstructorArgs } from './api/base'
import { EntityManager } from './api/entityManager'
import { Comstock } from './services/comstock'
import { CreatorNode, CreatorNodeConfig } from './services/creatorNode'
import { AudiusContracts } from './services/dataContracts'
import {
  DiscoveryProvider,
  DiscoveryProviderConfig
} from './services/discoveryProvider'
import { EthContracts } from './services/ethContracts'
import { EthWeb3Config, EthWeb3Manager } from './services/ethWeb3Manager'
import { Hedgehog, HedgehogConfig } from './services/hedgehog'
import { IdentityService } from './services/identity'
import { Schemas, SchemaValidator } from './services/schemaValidator'
import {
  SolanaWeb3Manager,
  SolanaUtils,
  SolanaWeb3Config
} from './services/solana'
import type { MonitoringCallbacks } from './services/types'
import { Web3Config, Web3Manager } from './services/web3Manager'
import {
  ProxyWormhole,
  ProxyWormholeConfig
} from './services/wormhole/ProxyWormhole'
import { Utils, getNStorageNodes } from './utils'
import type { Logger, Nullable } from './utils'
import { getPlatformLocalStorage, LocalStorage } from './utils/localStorage'
import { version } from './version'

type LibsIdentityServiceConfig = {
  url: string
  useHedgehogLocalStorage: boolean
}

type LibsHedgehogConfig = Omit<
  HedgehogConfig,
  'identityService' | 'localStorage'
>

type LibsSolanaWeb3Config = SolanaWeb3Config & {
  feePayerSecretKeys?: Uint8Array[]
}

type LibsDiscoveryProviderConfig = Omit<
  DiscoveryProviderConfig,
  'ethContracts' | 'web3Manager'
>

type LibsComstockConfig = {
  url: string
}

type AudiusLibsConfig = {
  web3Config: Web3Config
  ethWeb3Config: EthWeb3Config
  solanaWeb3Config: SolanaWeb3Config
  identityServiceConfig: LibsIdentityServiceConfig
  discoveryProviderConfig: LibsDiscoveryProviderConfig
  creatorNodeConfig: CreatorNodeConfig
  comstockConfig: LibsComstockConfig
  wormholeConfig: ProxyWormholeConfig
  hedgehogConfig: LibsHedgehogConfig
  isServer: boolean
  logger: Logger
  isDebug: boolean
  preferHigherPatchForPrimary: boolean
  preferHigherPatchForSecondaries: boolean
  localStorage: LocalStorage
  userId?: number
  wallet?: string
}

export class AudiusLibs {
  static configIdentityService(url: string, useHedgehogLocalStorage = true) {
    return { url, useHedgehogLocalStorage }
  }

  static configComstock(url: string) {
    return { url }
  }

  static configCreatorNode(
    fallbackUrl: string,
    passList: Nullable<Set<string>> = null,
    blockList: Nullable<Set<string>> = null,
    monitoringCallbacks: Nullable<MonitoringCallbacks> = {}
  ) {
    return {
      fallbackUrl,
      passList,
      blockList,
      monitoringCallbacks
    }
  }

  static async configExternalWeb3(
    registryAddress: string,
    web3Provider: string,
    networkId: string,
    walletOverride: Nullable<string> = null,
    entityManagerAddress: Nullable<string> = null
  ) {
    const web3Instance = await Utils.configureWeb3(web3Provider, networkId)
    if (!web3Instance) {
      throw new Error('External web3 incorrectly configured')
    }
    const wallets = await web3Instance.eth.getAccounts()
    return {
      registryAddress,
      entityManagerAddress,
      useExternalWeb3: true,
      externalWeb3Config: {
        web3: web3Instance,
        ownerWallet: walletOverride ?? wallets[0]
      }
    }
  }

  static configInternalWeb3(
    registryAddress: string,
    providers: provider,
    privateKey?: string,
    entityManagerAddress?: string
  ) {
    let providerList
    if (typeof providers === 'string') {
      providerList = providers.split(',')
    } else if (providers instanceof Web3) {
      providerList = [providers]
    } else if (Array.isArray(providers)) {
      providerList = providers
    } else {
      throw new Error(
        'Providers must be of type string, Array, or Web3 instance'
      )
    }

    return {
      registryAddress,
      entityManagerAddress,
      useExternalWeb3: false,
      internalWeb3Config: {
        web3ProviderEndpoints: providerList,
        privateKey
      }
    }
  }

  static configEthWeb3(
    tokenAddress: string,
    registryAddress: string,
    providers: provider,
    ownerWallet?: string,
    claimDistributionContractAddress?: string,
    wormholeContractAddress?: string
  ) {
    let providerList
    if (typeof providers === 'string') {
      providerList = providers.split(',')
    } else if (providers instanceof Web3) {
      providerList = [providers]
    } else if (Array.isArray(providers)) {
      providerList = providers
    } else {
      throw new Error(
        'Providers must be of type string, Array, or Web3 instance'
      )
    }

    return {
      tokenAddress,
      registryAddress,
      providers: providerList,
      ownerWallet,
      claimDistributionContractAddress,
      wormholeContractAddress
    }
  }

  static configWormhole() {
    return {}
  }

  static configSolanaWeb3({
    solanaClusterEndpoint,
    mintAddress,
    usdcMintAddress,
    solanaTokenAddress,
    feePayerAddress,
    claimableTokenProgramAddress,
    rewardsManagerProgramId,
    rewardsManagerProgramPDA,
    rewardsManagerTokenPDA,
    paymentRouterProgramId,
    useRelay,
    feePayerSecretKeys,
    confirmationTimeout
  }: LibsSolanaWeb3Config): SolanaWeb3Config {
    return {
      solanaClusterEndpoint,
      mintAddress,
      usdcMintAddress,
      solanaTokenAddress,
      feePayerAddress,
      claimableTokenProgramAddress,
      rewardsManagerProgramId,
      rewardsManagerProgramPDA,
      rewardsManagerTokenPDA,
      paymentRouterProgramId,
      useRelay,
      feePayerKeypairs: feePayerSecretKeys?.map((key) =>
        Keypair.fromSecretKey(key)
      ),
      confirmationTimeout
    }
  }

  version: string

  ethWeb3Config: EthWeb3Config
  web3Config: Web3Config
  solanaWeb3Config: SolanaWeb3Config
  identityServiceConfig: LibsIdentityServiceConfig
  creatorNodeConfig: CreatorNodeConfig
  discoveryProviderConfig: LibsDiscoveryProviderConfig
  comstockConfig: LibsComstockConfig
  wormholeConfig: ProxyWormholeConfig
  hedgehogConfig: LibsHedgehogConfig
  isServer: boolean
  isDebug: boolean
  logger: Logger

  identityService: Nullable<IdentityService>
  hedgehog: Nullable<HedgehogBase>
  discoveryProvider: Nullable<DiscoveryProvider>
  ethWeb3Manager: Nullable<EthWeb3Manager>
  ethContracts: Nullable<EthContracts>
  web3Manager: Nullable<Web3Manager>
  solanaWeb3Manager: Nullable<SolanaWeb3Manager>
  contracts: Nullable<AudiusContracts>
  wormholeClient: Nullable<ProxyWormhole>
  creatorNode: Nullable<CreatorNode>
  schemas?: Schemas
  comstock: Nullable<Comstock>

  ServiceProvider: Nullable<ServiceProvider>
  Account: Nullable<Account>
  User: Nullable<Users>
  Track: Nullable<Track>
  Playlist: Nullable<Playlists>
  File: Nullable<File>
  Rewards: Nullable<Rewards>
  Reactions: Nullable<Reactions>
  Notifications: Nullable<Notifications>
  EntityManager: Nullable<EntityManager>

  preferHigherPatchForPrimary: boolean
  preferHigherPatchForSecondaries: boolean
  localStorage: LocalStorage

  private currentWallet?: string
  private currentUserId?: number

  constructor({
    web3Config,
    ethWeb3Config,
    solanaWeb3Config,
    identityServiceConfig,
    discoveryProviderConfig,
    creatorNodeConfig,
    comstockConfig,
    wormholeConfig,
    hedgehogConfig,
    isServer,
    logger = console,
    isDebug = false,
    preferHigherPatchForPrimary = true,
    preferHigherPatchForSecondaries = true,
    localStorage,
    userId,
    wallet
  }: AudiusLibsConfig) {
    this.version = version

    this.ethWeb3Config = ethWeb3Config
    this.web3Config = web3Config
    this.solanaWeb3Config = solanaWeb3Config
    this.identityServiceConfig = identityServiceConfig
    this.creatorNodeConfig = creatorNodeConfig
    this.discoveryProviderConfig = discoveryProviderConfig
    this.comstockConfig = comstockConfig
    this.wormholeConfig = wormholeConfig
    this.hedgehogConfig = hedgehogConfig
    this.isServer = isServer
    this.isDebug = isDebug
    this.logger = logger

    this.identityService = null
    this.hedgehog = null
    this.discoveryProvider = null
    this.ethWeb3Manager = null
    this.ethContracts = null
    this.web3Manager = null
    this.solanaWeb3Manager = null
    this.wormholeClient = null
    this.contracts = null
    this.creatorNode = null
    this.comstock = null

    this.ServiceProvider = null
    this.Account = null
    this.User = null
    this.Track = null
    this.Playlist = null
    this.File = null
    this.Rewards = null
    this.Reactions = null
    this.Notifications = null
    this.EntityManager = null

    this.currentUserId = userId
    this.currentWallet = wallet

    this.preferHigherPatchForPrimary = preferHigherPatchForPrimary
    this.preferHigherPatchForSecondaries = preferHigherPatchForSecondaries
    this.localStorage = localStorage

    const schemaValidator = new SchemaValidator()
    schemaValidator.init()
    this.schemas = schemaValidator.getSchemas()
  }

  private async determineCreatorNodeEndpointForWallet(wallet?: string) {
    let creatorNodeEndpoint = this.creatorNodeConfig.fallbackUrl
    if (!wallet) {
      return creatorNodeEndpoint
    }
    if (this.creatorNodeConfig.storageNodeSelector) {
      const [storageNode] =
        this.creatorNodeConfig.storageNodeSelector.getNodes(wallet)
      if (storageNode) {
        creatorNodeEndpoint = storageNode
      }
    } else if (this.ethContracts) {
      const storageV2Nodes =
        await this.ethContracts.ServiceProviderFactoryClient.getServiceProviderList(
          'content-node'
        )
      const randomNodes = await getNStorageNodes(
        storageV2Nodes,
        1,
        this.creatorNodeConfig.wallet,
        this.logger
      )
      creatorNodeEndpoint = randomNodes[0]!
    }
    return creatorNodeEndpoint
  }

  async setCurrentUser({ wallet, userId }: { wallet: string; userId: number }) {
    this.currentWallet = wallet
    this.currentUserId = userId
    this.creatorNode?.setEndpoint(
      await this.determineCreatorNodeEndpointForWallet(wallet)
    )
    this.discoveryProvider?.setCurrentUser(userId)
    this.EntityManager?.setCurrentUserId(userId)
  }

  getCurrentUser() {
    return { wallet: this.currentWallet, userId: this.currentUserId }
  }

  clearCurrentUser() {
    delete this.currentWallet
    delete this.currentUserId
    this.creatorNode?.setEndpoint(this.creatorNodeConfig.fallbackUrl)
    this.discoveryProvider?.clearCurrentUser()
    this.EntityManager?.clearCurrentUserId()
  }

  async init() {
    if (!this.localStorage) {
      this.localStorage = await getPlatformLocalStorage()
    }

    this.web3Config = await this.web3Config

    if (this.identityServiceConfig) {
      this.identityService = new IdentityService({
        identityServiceEndpoint: this.identityServiceConfig.url
      })
      const hedgehogService = new Hedgehog({
        identityService: this.identityService,
        useLocalStorage: this.identityServiceConfig.useHedgehogLocalStorage,
        localStorage: this.localStorage,
        ...this.hedgehogConfig
      })
      this.hedgehog = hedgehogService.instance
      await this.hedgehog.waitUntilReady()
    } else if (this.web3Config && !this.web3Config.useExternalWeb3) {
      throw new Error('Identity Service required for internal Web3')
    }

    if (this.ethWeb3Config) {
      this.ethWeb3Manager = new EthWeb3Manager({
        web3Config: this.ethWeb3Config,
        identityService: this.identityService,
        hedgehog: this.hedgehog
      })
    }
    if (this.web3Config) {
      this.web3Manager = new Web3Manager({
        web3Config: this.web3Config,
        identityService: this.identityService,
        hedgehog: this.hedgehog,
        isServer: this.isServer
      })
      await this.web3Manager.init()
      if (this.identityService) {
        this.identityService.setWeb3Manager(this.web3Manager)
      }
    }
    if (this.solanaWeb3Config) {
      this.solanaWeb3Manager = new SolanaWeb3Manager(
        this.solanaWeb3Config,
        this.identityService,
        this.web3Manager
      )
      await this.solanaWeb3Manager.init()
    }

    const contractsToInit = []
    if (this.ethWeb3Manager) {
      const {
        tokenAddress,
        registryAddress,
        claimDistributionContractAddress,
        wormholeContractAddress
      } = this.ethWeb3Config

      this.ethContracts = new EthContracts({
        ethWeb3Manager: this.ethWeb3Manager,
        tokenContractAddress: tokenAddress,
        registryAddress,
        claimDistributionContractAddress,
        wormholeContractAddress,
        isServer: this.isServer,
        logger: this.logger,
        isDebug: this.isDebug
      })

      contractsToInit.push(this.ethContracts.init())
    }
    if (this.web3Manager) {
      this.contracts = new AudiusContracts(
        this.web3Manager,
        this.web3Config.registryAddress,
        this.web3Config.entityManagerAddress,
        this.isServer,
        this.logger
      )
      contractsToInit.push(this.contracts.init())
    }
    await Promise.all(contractsToInit)
    if (
      this.wormholeConfig &&
      this.ethWeb3Manager &&
      this.ethContracts &&
      this.solanaWeb3Manager
    ) {
      this.wormholeClient = new ProxyWormhole(
        this.hedgehog,
        this.ethWeb3Manager,
        this.ethContracts,
        this.identityService,
        this.solanaWeb3Manager
      )
    }

    if (this.discoveryProviderConfig) {
      this.discoveryProvider = new DiscoveryProvider({
        ethContracts: this.ethContracts,
        web3Manager: this.web3Manager,
        localStorage: this.localStorage,
        ...this.discoveryProviderConfig
      })
      await this.discoveryProvider.init()
      this.web3Manager?.setDiscoveryProvider(this.discoveryProvider)
    }

    if (this.creatorNodeConfig) {
      const creatorNodeEndpoint =
        await this.determineCreatorNodeEndpointForWallet(
          this.creatorNodeConfig.wallet
        )

      this.creatorNode = new CreatorNode(
        this.web3Manager,
        creatorNodeEndpoint,
        this.isServer,
        this.schemas,
        this.creatorNodeConfig.passList,
        this.creatorNodeConfig.blockList,
        this.creatorNodeConfig.monitoringCallbacks,
        this.creatorNodeConfig.storageNodeSelector,
        this.creatorNodeConfig.wallet,
        this.creatorNodeConfig.userId
      )
      await this.creatorNode.init()
    }

    if (this.comstockConfig) {
      this.comstock = new Comstock(this.comstockConfig.url)
    }

    const services = [
      this.identityService,
      this.hedgehog,
      this.discoveryProvider,
      this.web3Manager,
      this.contracts,
      this.ethWeb3Manager,
      this.ethContracts,
      this.solanaWeb3Manager,
      this.wormholeClient,
      this.creatorNode,
      this.comstock,
      this.isServer,
      this.logger
    ] as BaseConstructorArgs

    this.ServiceProvider = new ServiceProvider(...services)
    this.User = new Users(
      this.ServiceProvider,
      this.preferHigherPatchForPrimary,
      this.preferHigherPatchForSecondaries,
      ...services
    )
    this.Account = new Account(this.User, this.ServiceProvider, ...services)
    this.Track = new Track(...services)
    this.Playlist = new Playlists(...services)
    this.File = new File(this.User, this.ServiceProvider, ...services)
    this.Rewards = new Rewards(this.ServiceProvider, ...services)
    this.Reactions = new Reactions(...services)
    this.Notifications = new Notifications(...services)
    this.EntityManager = new EntityManager(...services)
    if (this.currentUserId) {
      this.EntityManager.setCurrentUserId(this.currentUserId)
    }
  }
}

export { SolanaUtils }

export { Utils } from './utils'
export { RewardsAttester } from './services/solana'
