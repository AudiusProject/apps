import { productionConfig } from '../../config/production'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import { RendezvousHash } from '../../utils/rendezvous'
import type { LoggerService } from '../Logger'

import { getDefaultStorageNodeSelectorConfig } from './getDefaultConfig'
import { isNodeHealthy } from './isNodeHealthy'
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
  private nodesPromise?: Promise<void>

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
  }

  /**
   * Fetches the node list once, on first use rather than at construction,
   * so clients that never upload don't pay for the request. Concurrent
   * callers share the same request; a failed request is retried next time.
   */
  private ensureAvailableStorageNodes() {
    if (!this.nodesPromise) {
      this.nodesPromise = this.updateAvailableStorageNodes(
        this.config.endpoint
      ).then(
        (ok) => {
          if (!ok) this.nodesPromise = undefined
        },
        (e) => {
          this.logger.warn('Failed to update available storage nodes', e)
          this.nodesPromise = undefined
        }
      )
    }
    return this.nodesPromise
  }

  private async updateAvailableStorageNodes(endpoint: string) {
    this.logger.info('Updating list of available storage nodes')
    const healthCheckEndpoint = `${endpoint}/health_check`
    const healthCheckResponse = await fetch(healthCheckEndpoint)
    if (!healthCheckResponse.ok) {
      this.logger.warn('API health check did not respond successfully')
      return false
    }

    const responseData: { data: HealthCheckResponseData } =
      await healthCheckResponse.json()
    const contentNodes = responseData.data.network?.content_nodes

    if (!contentNodes) {
      this.logger.warn(
        'API health check did not contain any available content nodes'
      )
      return false
    }

    this.nodes = contentNodes
    this.selectionState = 'healthy_only'
    return true
  }

  public async getSelectedNode(forceReselect = false) {
    if (this.selectedNode && !forceReselect) {
      return this.selectedNode
    }

    await this.ensureAvailableStorageNodes()
    return await this.select()
  }

  public triedSelectingAllNodes() {
    return this.selectionState === 'failed_all'
  }

  public getNodes(cid: string) {
    // Synchronous, so this uses the current list and refreshes it for later
    this.ensureAvailableStorageNodes()
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
      // No healthy nodes found
      this.selectedNode = null
      this.logger.warn('No healthy nodes found')
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

  private orderNodes(key: string) {
    const endpoints = this.nodes.map((node) => node.endpoint.toLowerCase())
    const hash = new RendezvousHash(...endpoints)
    return hash.getN(this.nodes.length, key)
  }
}
