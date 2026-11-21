import axios from 'axios'

import RendezvousHash from './rendezvous'
import type { Logger } from './types'

export type StorageNode = {
  owner: any
  endpoint: string
  spID: number
  type: string
  blockNumber: number
  delegateOwnerWallet: string
}

export const getNStorageNodes = async (
  allNodes: StorageNode[],
  numNodes = 0,
  wallet = '',
  logger: Logger = console
): Promise<string[]> => {
  try {
    if (numNodes === 0) numNodes = allNodes.length
    let sortedEndpoints: string[]

    if (wallet?.length) {
      const endpoints = allNodes.map((n) => n.endpoint.toLowerCase())
      const hash = new RendezvousHash(...endpoints)
      sortedEndpoints = hash.getN(endpoints.length, wallet.toLowerCase())
    } else {
      sortedEndpoints = allNodes.map((n) => n.endpoint)
    }

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

export const isNodeHealthy = async (
  endpoint: string,
  logger: Logger = console
) => {
  try {
    const resp = await axios({
      baseURL: endpoint,
      url: `/health_check`,
      method: 'get',
      timeout: 3000
    })
    if (resp.status === 200) return true
    else {
      logger.warn(
        `isNodeHealthy: ${endpoint} returned non-200 status ${resp.status}`
      )
      return false
    }
  } catch (e) {
    logger.error(`isNodeHealthy: Error checking health: ${e}`)
    return false
  }
}
