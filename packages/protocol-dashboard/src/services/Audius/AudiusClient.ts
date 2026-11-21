import Claim from './claim/claim'
import Delegate from './delegate/delegate'
import Governance from './governance/governance'
import {
  awaitSetup,
  decodeCallData,
  displayAud,
  displayShortAud,
  getAud,
  getAverageBlockTime,
  getBNPercentage,
  getBlock,
  getBlockNearTimestamp,
  getContentNodeMetadata,
  getDiscoveryNodeMetadata,
  getEthBlockNumber,
  getEthWallet,
  getValidatorMetadata,
  getWei,
  hasPermissions,
  isEoa,
  onSetup,
  onSetupFinished,
  onWalletAccountLoaded,
  toChecksumAddress
} from './helpers'
import NodeType from './nodeType'
import ServiceProviderClient from './service-provider/serviceProviderClient'
import { setup } from './setup'
import Staking from './staking/staking'
import AudiusToken from './token/audiusToken'
import { getUserDelegates } from './wrappers'

export class AudiusClient {
  constructor() {
    this.AudiusToken = new AudiusToken(this)
    this.Delegate = new Delegate(this)
    this.ServiceProviderClient = new ServiceProviderClient(this)
    this.NodeType = new NodeType(this)
    this.Staking = new Staking(this)
    this.Governance = new Governance(this)
    this.Claim = new Claim(this)
    this.onSetup()
  }

  AudiusToken: AudiusToken
  Delegate: Delegate
  ServiceProviderClient: ServiceProviderClient
  NodeType: NodeType
  Staking: Staking
  Governance: Governance
  Claim: Claim

  libs: any = {}
  setup = setup

  _setupPromiseResolve: undefined | (() => void)
  isSetupPromise: undefined | Promise<void>

  walletAccountLoadedPromise: undefined | Promise<string>
  _metaMaskAccountLoadedResolve: undefined | ((account: string | null) => void)

  isSetup = false
  isMetaMaskAccountLoaded = false
  hasValidAccount = false
  isAccountMisconfigured = false
  isMisconfigured = false
  isViewOnly = false

  hasPermissions = hasPermissions
  awaitSetup = awaitSetup

  onSetup = onSetup
  onSetupFinished = onSetupFinished
  onWalletAccountLoaded = onWalletAccountLoaded

  getUserDelegates = getUserDelegates

  getEthBlockNumber = getEthBlockNumber
  getEthWallet = getEthWallet
  getAverageBlockTime = getAverageBlockTime
  getBlockNearTimestamp = getBlockNearTimestamp
  getBlock = getBlock
  isEoa = isEoa
  toChecksumAddress = toChecksumAddress

  static getBNPercentage = getBNPercentage
  static displayAud = displayAud
  static displayShortAud = displayShortAud
  static getAud = getAud
  static getWei = getWei
  static getDiscoveryNodeMetadata = getDiscoveryNodeMetadata
  static getContentNodeMetadata = getContentNodeMetadata
  static getValidatorMetadata = getValidatorMetadata
  static decodeCallData = decodeCallData
}

window.AudiusClient = AudiusClient

export default AudiusClient
