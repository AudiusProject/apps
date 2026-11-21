import type { Hedgehog } from '@audius/hedgehog'

import type { Comstock } from '../services/comstock'
import type { CreatorNode } from '../services/creatorNode'
import type { AudiusContracts } from '../services/dataContracts'
import type { DiscoveryProvider } from '../services/discoveryProvider'
import type { EthContracts } from '../services/ethContracts'
import type { EthWeb3Manager } from '../services/ethWeb3Manager'
import type { IdentityService } from '../services/identity'
import type { SolanaWeb3Manager } from '../services/solana'
import type { Web3Manager } from '../services/web3Manager'
import type { Wormhole } from '../services/wormhole'

export const Services = Object.freeze({
  IDENTITY_SERVICE: 'Identity Service',
  HEDGEHOG: 'Hedgehog',
  DISCOVERY_PROVIDER: 'Discovery Provider',
  CREATOR_NODE: 'Creator Node',
  COMSTOCK: 'Comstock',
  SOLANA_WEB3_MANAGER: 'Solana Web3 Manager'
})

export type BaseConstructorArgs = [
  IdentityService,
  Hedgehog,
  DiscoveryProvider,
  Web3Manager,
  AudiusContracts,
  EthWeb3Manager,
  EthContracts,
  SolanaWeb3Manager,
  Wormhole,
  CreatorNode,
  Comstock,
  boolean,
  any
]

export class Base {
  identityService: IdentityService
  hedgehog: Hedgehog
  discoveryProvider: DiscoveryProvider
  web3Manager: Web3Manager
  contracts: AudiusContracts
  ethWeb3Manager: EthWeb3Manager
  ethContracts: EthContracts
  solanaWeb3Manager: SolanaWeb3Manager
  wormholeClient: Wormhole
  creatorNode: CreatorNode
  comstock: Comstock
  isServer: boolean
  logger: any = console

  _serviceMapping: { [service: string]: any }

  constructor(
    identityService: IdentityService,
    hedgehog: Hedgehog,
    discoveryProvider: DiscoveryProvider,
    web3Manager: Web3Manager,
    contracts: AudiusContracts,
    ethWeb3Manager: EthWeb3Manager,
    ethContracts: EthContracts,
    solanaWeb3Manager: SolanaWeb3Manager,
    wormholeClient: Wormhole,
    creatorNode: CreatorNode,
    comstock: Comstock,
    isServer: boolean,
    logger: any = console
  ) {
    this.identityService = identityService
    this.hedgehog = hedgehog
    this.discoveryProvider = discoveryProvider
    this.web3Manager = web3Manager
    this.contracts = contracts
    this.ethWeb3Manager = ethWeb3Manager
    this.ethContracts = ethContracts
    this.solanaWeb3Manager = solanaWeb3Manager
    this.wormholeClient = wormholeClient
    this.creatorNode = creatorNode
    this.comstock = comstock
    this.isServer = isServer
    this.logger = logger

    this._serviceMapping = {
      [Services.IDENTITY_SERVICE]: this.identityService,
      [Services.HEDGEHOG]: this.hedgehog,
      [Services.DISCOVERY_PROVIDER]: this.discoveryProvider,
      [Services.CREATOR_NODE]: this.creatorNode,
      [Services.COMSTOCK]: this.comstock,
      [Services.SOLANA_WEB3_MANAGER]: this.solanaWeb3Manager
    }
  }

  REQUIRES(...services: string[]) {
    services.forEach((s) => {
      if (!this._serviceMapping[s]) return Base._missingService(...services)
    })
  }

  IS_OBJECT(o: any) {
    if (typeof o !== 'object') return Base._invalidType('object')
  }

  OBJECT_HAS_PROPS(o: any, props: string[], requiredProps: string[]) {
    const missingProps: string[] = []
    props.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(o, prop))
        missingProps.push(prop)
    })
    if (missingProps.length > 0) return Base._missingProps(missingProps)

    const missingRequiredProps: string[] = []
    requiredProps.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(o, prop) || o[prop] === '')
        missingRequiredProps.push(prop)
    })
    if (missingRequiredProps.length > 0)
      return Base._missingPropValues(missingRequiredProps)
  }

  FILE_IS_VALID(file: any) {
    if (this.isServer) {
      if (
        !file ||
        typeof file !== 'object' ||
        typeof file.pipe !== 'function' ||
        !file.readable
      ) {
        return Base._invalidFile()
      }
    } else {
      if (!file || typeof file !== 'object') {
        return Base._missingFile()
      }
    }
  }

  static _missingService(...serviceNames: string[]) {
    throw new Error(
      `Requires the following services: ${serviceNames.join(', ')}`
    )
  }

  static _invalidType(type: string) {
    throw new Error(`Argument must be of type ${type}`)
  }

  static _missingProps(props: string[]) {
    throw new Error(`Missing props ${props.join(', ')}`)
  }

  static _missingPropValues(props: string[]) {
    throw new Error(`Missing field values ${props.join(', ')}`)
  }

  static _invalidFile() {
    throw new Error('Expected file as readable stream')
  }

  static _missingFile() {
    throw new Error('Missing or malformed file')
  }
}
