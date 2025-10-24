import { useQuery } from '@tanstack/react-query'

import { ServiceType } from 'types'

const bytesToGb = (bytes: number) => Math.floor(bytes / 10 ** 9)

const useNodeHealth = (endpoint: string, serviceType: ServiceType) => {
  const { data, status, error } = useQuery({
    queryKey: ['health', { endpoint }],
    queryFn: async () => {
      const response = await fetch(`${endpoint}/health_check`)
      if (!response.ok) {
        throw new Error(
          `Failed fetching health check from ${endpoint}: ${response.status} ${response.statusText}`
        )
      }
      const data = await response.json()

      if (serviceType === 'discovery-node') {
        try {
          const portHealthResponse = await fetch(`${endpoint}/chain/peer`)
          const portHealth = portHealthResponse.ok
          return {
            ...data,
            portHealth
          }
        } catch (e) {
          return data
        }
      } else {
        return data
      }
    }
  })

  if (status === 'pending' || status === 'error') {
    return { status, error, health: null }
  }

  const { data: health } = data
  let res = {}

  if (serviceType === 'discovery-node') {
    // ----------Discovery health----------

    res = {
      diskGbUsed: health?.filesystem_used
        ? bytesToGb(health.filesystem_used)
        : undefined,
      diskGbSize: health?.filesystem_size
        ? bytesToGb(health.filesystem_size)
        : undefined,
      dbGbUsed: health?.database_size
        ? bytesToGb(health.database_size)
        : undefined,
      dbSizeErr: !health?.database_size ? 'unknown error' : undefined,
      version: health?.version,
      operatorWallet: '', // not exposed in Discovery's health check
      delegateOwnerWallet: data?.signer,
      startedAt: data?.comms?.booted ? new Date(data?.comms.booted) : undefined,
      otherErrors: health?.errors?.length ? health.errors : undefined
    }
  } else {
    // ----------Content health----------

    const mediorumDiskUsed = bytesToGb(health.mediorumPathUsed)
    const mediorumDiskSize = bytesToGb(health.mediorumPathSize)

    // Last "full" repair.go run (checks files that are not in the top R rendezvous)
    const lastCleanupSize = health.lastSuccessfulCleanup?.ContentSize
      ? bytesToGb(health.lastSuccessfulCleanup.ContentSize)
      : '?'

    // Last repair.go run (only checks files for which this node is in the top R rendezvous)
    const lastRepairSize = health.lastSuccessfulRepair?.ContentSize
      ? bytesToGb(health.lastSuccessfulRepair.ContentSize)
      : '?'

    let totalMediorumUsed: number | '?' = '?'
    if (health.blobStorePrefix === 'file') totalMediorumUsed = mediorumDiskUsed
    else {
      // Use the last "full" repair.go run because it would've checked the most files
      if (typeof lastCleanupSize === 'number')
        totalMediorumUsed = lastCleanupSize
      else if (typeof lastRepairSize === 'number')
        totalMediorumUsed = lastRepairSize

      // But it's possible the last normal repair.go run added more files
      if (lastRepairSize > lastCleanupSize) totalMediorumUsed = lastRepairSize
    }

    const MAX_STORAGE_SIZE = 4000
    const totalMediorumSize =
      mediorumDiskSize && health.blobStorePrefix === 'file'
        ? mediorumDiskSize
        : MAX_STORAGE_SIZE
    const diskGbUsed = totalMediorumUsed
    const diskGbSize =
      diskGbUsed === '?'
        ? totalMediorumSize
        : Math.max(totalMediorumSize, diskGbUsed)

    // calculate healthy peers counts
    const now = new Date()
    const twoMinutesAgoDate = new Date(now.getTime() - 2 * 60 * 1000)
    let healthyPeers2m = 0
    if (health?.peerHealths) {
      for (const endpoint of Object.keys(health.peerHealths)) {
        const peerHealth = health.peerHealths[endpoint]
        const healthDate = new Date(peerHealth?.lastHealthy)
        if (!isNaN(healthDate.getTime()) && healthDate > twoMinutesAgoDate) {
          healthyPeers2m++
        }
      }
    }

    res = {
      diskGbUsed,
      diskGbSize,
      healthyPeers2m,
      dbGbUsed: health?.databaseSize
        ? bytesToGb(health.databaseSize)
        : undefined,
      dbSizeErr: health?.dbSizeErr,
      version: health?.version,
      operatorWallet: health?.spOwnerWallet,
      delegateOwnerWallet: health?.self?.wallet,
      startedAt: health?.startedAt ? new Date(health.startedAt) : undefined
    }
  }

  return {
    status,
    error: null, // No error since we have data at this point
    health: res
  }
}

export default useNodeHealth
