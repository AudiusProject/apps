import { productionConfig } from '../../config/production'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import { RendezvousHash } from '../../utils/rendezvous'
import type { LoggerService } from '../Logger'

import { getDefaultStorageNodeSelectorConfig } from './getDefaultConfig'
import { isNodeHealthy } from './getNStorageNodes'
import type {
  HealthCheckResponseData,
  StorageNode,
  StorageNodeSelectorConfig,
  StorageNodeSelectorConfigInternal,
  StorageNodeSelectorService
} from './types'

export class StorageNodeSelector implements StorageNodeSelectorService {
  private readonly config: StorageNodeSelectorConfigInternal
  private readonly logger: LoggerService
  private nodes: StorageNode[]
  private orderedNodes?: string[] // endpoints (lowercase)
  private selectedNode?: string | null
  private selectionState: 'healthy_only' | 'failed_all'

  constructor(config: StorageNodeSelectorConfig) {
    this.config = mergeConfigWithDefaults(
      config,
      getDefaultStorageNodeSelectorConfig(productionConfig)
    )

    this.logger = this.config.logger.createPrefixedLogger(
      '[storage-node-selector]'
    )
    this.nodes = this.config.bootstrapNodes ?? []
    this.selectionState = 'healthy_only'

    this.updateAvailableStorageNodes(this.config.endpoint)
  }

  private async updateAvailableStorageNodes(endpoint: string) {
    this.logger.info('Updating list of available storage nodes')
    const healthCheckEndpoint = `${endpoint}/health_check`
    const healthCheckResponse = await fetch(healthCheckEndpoint)
    if (!healthCheckResponse.ok) {
      this.logger.warn('API health check did not respond successfully')
      return
    }

    const responseData: { data: HealthCheckResponseData } =
      await healthCheckResponse.json()
    const contentNodes = responseData.data.network?.content_nodes

    if (!contentNodes) {
      this.logger.warn(
        'API health check did not contain any available content nodes'
      )
      return
    }

    this.nodes = contentNodes
    this.selectionState = 'healthy_only'
  }

  public async getSelectedNode(forceReselect = false) {
    if (this.selectedNode && !forceReselect) {
      return this.selectedNode
    }

    return await this.select()
  }

  public triedSelectingAllNodes() {
    return this.selectionState === 'failed_all'
  }

  public getNodes(cid: string) {
    return this.orderNodes(cid)
  }

  private async select(): Promise<string | null | undefined> {
    // We've selected all healthy nodes. Restart from the beginning of the ordered list
    if (this.selectionState === 'failed_all') {
      this.selectionState = 'healthy_only'
    }

    // Select the next node in rendezvous order from the list of all nodes
    const selectedNode = await this.selectUntilEndOfList()

    if (selectedNode) {
      this.selectedNode = selectedNode
      this.logger.info('Selected content node', this.selectedNode)
    } else {
      // No healthy nodes found. Fall back to a random node
      this.selectedNode = this.getRandomNode()
      this.logger.warn(
        'No healthy nodes found. Falling back to random node:',
        this.selectedNode
      )
      this.selectionState = 'failed_all'
    }

    return this.selectedNode
  }

  private async selectUntilEndOfList(): Promise<string | undefined> {
    if (!this.orderedNodes?.length) {
      this.orderedNodes = this.orderNodes(new Date().toString())
    }

    if (this.orderedNodes.length === 0) {
      return undefined
    }

    const currentNodeIndex = this.selectedNode
      ? this.orderedNodes.indexOf(this.selectedNode)
      : -1

    let selectedNode: string | undefined
    let nextNodeIndex = currentNodeIndex

    while (nextNodeIndex !== this.orderedNodes.length - 1) {
      nextNodeIndex++
      const nextNode = this.orderedNodes[nextNodeIndex]
      if (!nextNode) continue // should never happen unless this.orderedNodes has falsy values
      if (await isNodeHealthy(nextNode)) {
        selectedNode = nextNode
        break
      }
    }

    return selectedNode
  }

  private getRandomNode(): string | null {
    if (!this.orderedNodes?.length) {
      this.orderedNodes = this.orderNodes(new Date().toString())
    }
    if (this.orderedNodes.length === 0) {
      return null
    }
    const randomIndex = Math.floor(Math.random() * this.orderedNodes.length)
    return this.orderedNodes[randomIndex] ?? null
  }

  private orderNodes(key: string) {
    const endpoints = this.nodes.map((node) => node.endpoint.toLowerCase())
    const hash = new RendezvousHash(...endpoints)
    return hash.getN(this.nodes.length, key)
  }
}
