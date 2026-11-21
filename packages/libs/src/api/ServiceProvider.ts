import { sampleSize } from 'lodash'

import type { ServiceWithEndpoint } from '../utils'
import { getNStorageNodes } from '../utils/getNStorageNodes'

import { Base, BaseConstructorArgs } from './base'

const CONTENT_NODE_SERVICE_NAME = 'content-node'
const DISCOVERY_NODE_SERVICE_NAME = 'discovery-node'

export class ServiceProvider extends Base {
  cachedStorageNodes: Array<{
    owner: any
    endpoint: string
    spID: number
    type: string
    blockNumber: number
    delegateOwnerWallet: string
  }>

  constructor(...services: BaseConstructorArgs) {
    super(...services)
    this.cachedStorageNodes = []
  }

  async listCreatorNodes() {
    return await this.ethContracts.ServiceProviderFactoryClient.getServiceProviderList(
      CONTENT_NODE_SERVICE_NAME
    )
  }

  async autoSelectStorageV2Nodes(
    numNodes = 0,
    userWallet = '',
    logger = console
  ): Promise<string[]> {
    if (!this.cachedStorageNodes.length) {
      this.cachedStorageNodes = await this.listCreatorNodes()
    }
    return await getNStorageNodes(
      this.cachedStorageNodes,
      numNodes,
      userWallet,
      logger
    )
  }

  async listDiscoveryProviders() {
    return await this.ethContracts.ServiceProviderFactoryClient.getServiceProviderList(
      DISCOVERY_NODE_SERVICE_NAME
    )
  }

  async getUniquelyOwnedDiscoveryNodes({
    quorumSize,
    discoveryNodes = [],
    filter = async (_) => true,
    useWhitelist = true
  }: {
    quorumSize: number
    discoveryNodes?: ServiceWithEndpoint[]
    filter?: (node: ServiceWithEndpoint) => Promise<boolean>
    useWhitelist?: boolean
  }) {
    if (!discoveryNodes || discoveryNodes.length === 0) {
      discoveryNodes = (await this.discoveryProvider.serviceSelector.findAll({
        verbose: true,
        whitelist: useWhitelist ? undefined : null
      })) as ServiceWithEndpoint[]
    }

    discoveryNodes.filter(filter)

    const grouped = discoveryNodes.reduce<{
      [owner: string]: ServiceWithEndpoint[]
    }>((acc, curr) => {
      if (curr.owner in acc) {
        acc[curr.owner]?.push(curr)
      } else {
        acc[curr.owner] = [curr]
      }
      return acc
    }, {})

    if (Object.keys(grouped).length < quorumSize) {
      throw new Error('Not enough unique owners to choose from')
    }

    const owners = sampleSize(Object.keys(grouped), quorumSize)

    return owners.map(
      (owner) =>
        (sampleSize(grouped[owner], 1)[0] as ServiceWithEndpoint).endpoint
    )
  }
}
