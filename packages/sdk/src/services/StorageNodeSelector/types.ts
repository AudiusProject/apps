import type { DiscoveryNodeSelectorService } from '../DiscoveryNodeSelector'
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
   * Starting list of healthy storage nodes to use before a discovery node is selected
   */
  bootstrapNodes: StorageNode[]
  /**
   * Logger service, defaults to console logging
   */
  logger: LoggerService
}

export type StorageNodeSelectorConfig =
  Partial<StorageNodeSelectorConfigInternal> & {
    /**
     * DiscoveryNodeSelector instance being used, so that the node can listen for
     * selection events and update its healthy storage node list
     */
    discoveryNodeSelector: DiscoveryNodeSelectorService
  }
