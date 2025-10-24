import type { LoggerService } from '../Logger'

export type StorageNodeSelectorService = {
  getSelectedNode: (
    forceReselect?: boolean
  ) => Promise<string | null | undefined>
  getNodes: (cid: string) => string[]
  triedSelectingAllNodes: () => boolean
}

export type StorageNode = {
  endpoint: string
  delegateOwnerWallet: string
}

export type StorageNodeSelectorConfigInternal = {
  /**
   * Starting list of healthy storage nodes to use before the current list is fetched from API
   */
  bootstrapNodes: StorageNode[]
  /**
   * Logger service, defaults to console logging
   */
  logger: LoggerService
  /**
   * API endpoint to fetch storage node list
   */
  endpoint: string
}

export type StorageNodeSelectorConfig =
  Partial<StorageNodeSelectorConfigInternal>

// Partial shape of response from API /health_check endpoint
// that we use to get the list of storage nodes
export type HealthCheckResponseData = {
  network?: {
    content_nodes: StorageNode[]
  }
}
