import { useQuery } from '@tanstack/react-query'

import { ServiceType } from 'types'

const bytesToGb = (bytes: number) => Math.floor(bytes / 10 ** 9)

const useNodeHealth = (endpoint: string, serviceType: ServiceType) => {
  const isValidator = serviceType === ServiceType.Validator
  const healthPath = isValidator ? '/health-check' : '/health_check'
  const { data, status, error } = useQuery({
    queryKey: ['health', { endpoint, healthPath }],
    queryFn: async () => {
      const response = await fetch(`${endpoint}${healthPath}`)
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

  if (isValidator) {
    const core = data?.core ?? {}

    const hasPrimitiveProps = (o: Record<string, unknown>) =>
      Object.values(o).some(
        (x) => x === null || typeof x !== 'object' || Array.isArray(x)
      )
    const countPeers = (val: any): number => {
      if (val == null) return 0
      if (Array.isArray(val)) {
        return val.reduce(
          (sum: number, item) =>
            sum +
            (item && typeof item === 'object' && !Array.isArray(item)
              ? hasPrimitiveProps(item)
                ? 1
                : countPeers(item)
              : 1),
          0
        )
      }
      if (typeof val !== 'object') return 0
      const subObjects = Object.values(val).filter(
        (v): v is Record<string, unknown> =>
          v !== null && typeof v === 'object' && !Array.isArray(v)
      )
      const arrays = Object.values(val).filter((v): v is unknown[] =>
        Array.isArray(v)
      )
      if (subObjects.length === 0 && arrays.length === 0) return 0
      if (subObjects.some(hasPrimitiveProps)) {
        return subObjects.length + arrays.reduce((s, a) => s + countPeers(a), 0)
      }
      return (
        subObjects.reduce((s, o) => s + countPeers(o), 0) +
        arrays.reduce((s, a) => s + countPeers(a), 0)
      )
    }
    const peerCount = countPeers(core?.peers)

    const syncInfo = core?.sync_info ?? {}
    const findHeight = (obj: any): number | undefined => {
      if (!obj || typeof obj !== 'object') return undefined
      for (const k of [
        'latest_block_height',
        'block_height',
        'height',
        'current_height'
      ]) {
        const v = obj[k]
        if (typeof v === 'number') return v
        if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
      }
      for (const v of Object.values(obj)) {
        const found = findHeight(v)
        if (found !== undefined) return found
      }
      return undefined
    }
    const currentHeight = findHeight(syncInfo) ?? findHeight(core)

    const parseDurationMs = (s: unknown): number | undefined => {
      if (typeof s !== 'string') return undefined
      let total = 0
      const re = /(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g
      let match: RegExpExecArray | null
      let matched = false
      while ((match = re.exec(s)) !== null) {
        matched = true
        const n = parseFloat(match[1])
        switch (match[2]) {
          case 'ns':
            total += n / 1e6
            break
          case 'us':
          case 'µs':
            total += n / 1e3
            break
          case 'ms':
            total += n
            break
          case 's':
            total += n * 1000
            break
          case 'm':
            total += n * 60 * 1000
            break
          case 'h':
            total += n * 60 * 60 * 1000
            break
        }
      }
      return matched ? total : undefined
    }
    let startedAt: Date | undefined
    const uptimeMs = parseDurationMs(data?.uptime)
    const ts = data?.timestamp ? Date.parse(data.timestamp) : NaN
    if (!isNaN(ts) && uptimeMs !== undefined) {
      startedAt = new Date(ts - uptimeMs)
    }

    return {
      status,
      error: null,
      health: {
        version: data?.data?.version ?? data?.version,
        chainId: core?.chain_info?.chain_id,
        nodeType: core?.node_info?.node_type,
        ethAddress: core?.node_info?.eth_address ?? data?.signer,
        peerCount,
        currentHeight,
        storageType: core?.storage_info?.storage_type,
        startedAt,
        gitSha: typeof data?.git === 'string' ? data.git : undefined,
        delegateOwnerWallet: data?.signer
      }
    }
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
