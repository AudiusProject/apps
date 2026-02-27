import axios from 'axios'

import { RendezvousHash } from '../../utils/rendezvous'

export type StorageNode = {
  owner: any
  endpoint: string
  spID: number
  type: string
  blockNumber: number
  delegateOwnerWallet: string
}

/**
 * Selects numNodes storage nodes from the given list of allNodes, optionally ordering them (descending) by rendezvous score.
 * @dev This makes the wallet lowercase - not suitable for use with CIDs because they're case sensitive (use RendezvousHash directly instead).
 */
export const getNStorageNodes = async (
  allNodes: StorageNode[],
  numNodes = 0,
  wallet = '',
  logger = console
): Promise<string[]> => {
  try {
    if (numNodes === 0) numNodes = allNodes.length
    let sortedEndpoints: string[]

    // Sort endpoints by rendezvous score if a rendezvous key is provided
    if (wallet?.length) {
      const endpoints = allNodes.map((n) => n.endpoint.toLowerCase())
      const hash = new RendezvousHash(...endpoints)
      sortedEndpoints = hash.getN(endpoints.length, wallet.toLowerCase())
    } else {
      sortedEndpoints = allNodes.map((n) => n.endpoint)
    }

    // Check multiple nodes at a time for health until we have numNodes healthy nodes
    const healthyEndpoints: string[] = []
    for (let i = 0; i < sortedEndpoints.length; i += numNodes) {
      const batch = sortedEndpoints.slice(i, i + numNodes)
      const healthCheckPromises = batch.map(
        async (endpoint) => await isNodeHealthy(endpoint, logger)
      )
      const healthCheckResults = await Promise.all(healthCheckPromises)

      for (let j = 0; j < healthCheckResults.length; j++) {
        if (healthCheckResults[j]) {
          healthyEndpoints.push(batch[j]!)
        }
      }

      if (healthyEndpoints.length >= numNodes) {
        return healthyEndpoints.slice(0, numNodes)
      }
    }

    if (numNodes !== allNodes.length && sortedEndpoints.length < numNodes) {
      logger.error(
        `getNStorageNodes: Could not select ${numNodes} healthy nodes from ${allNodes.length} nodes`
      )
    }

    return healthyEndpoints
  } catch (e) {
    logger.error(`getNStorageNodes: Error selecting nodes: ${e}`)
    return []
  }
}

export const isNodeHealthy = async (endpoint: string, logger = console) => {
  try {
    const resp = await axios({
      baseURL: endpoint,
      url: `/health_check`,
      method: 'get',
      timeout: 10_000
    })
    if (resp.status !== 200) {
      logger.warn(
        `isNodeHealthy: ${endpoint} returned non-200 status ${resp.status}`
      )
      return false
    }

    // check has space + not slow
    const health = resp.data.data

    // skip nodes if avg transcode time is over 3 minutes
    const avgTranscodeTime = health.transcodeStats?.AvgTranscodeTime || 0
    const isSlowTranscode = avgTranscodeTime > 180
    return health.diskHasSpace && !isSlowTranscode
  } catch (e) {
    logger.error(`isNodeHealthy: Error checking health: ${e}`)
    return false
  }
}
