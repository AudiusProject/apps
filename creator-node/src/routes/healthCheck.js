const { handleResponse, successResponse, errorResponseServerError } = require('../apiHelpers')
const config = require('../config.js')
const versionInfo = require('../../.version.json')
const {
  getMonitor,
  MONITORS
} = require('../monitors/monitors')

const DiskManager = require('../diskManager')

const MAX_DB_CONNECTIONS = config.get('dbConnectionPoolMax')
const MAX_DISK_USAGE_PERCENT = 90 // 90%

module.exports = function (app) {
  /**
   * Performs diagnostic ipfs operations to confirm functionality
   */
  app.get('/health_check/ipfs', handleResponse(async (req, res) => {
    if (config.get('isReadOnlyMode')) {
      return errorResponseServerError()
    }

    const value = await getMonitor(MONITORS.IPFS_READ_WRITE_STATUS)
    if (!value) {
      return errorResponseServerError({ error: 'IPFS not healthy' })
    }

    const { hash, duration } = JSON.parse(value)
    return successResponse({ hash, duration })
  }))

  /**
   * Exposes current and max db connection stats.
   * Returns error if db connection threshold exceeded, else success.
   */
  app.get('/db_check', handleResponse(async (req, res) => {
    const verbose = (req.query.verbose === 'true')
    const maxConnections = parseInt(req.query.maxConnections) || MAX_DB_CONNECTIONS

    // Get number of open DB connections
    const numConnections = parseInt(await getMonitor(MONITORS.DATABASE_CONNECTIONS))

    // Get detailed connection info
    let activeConnections = null
    let idleConnections = null
    const connectionInfo = JSON.parse(await getMonitor(MONITORS.DATABASE_CONNECTION_INFO))
    if (connectionInfo) {
      activeConnections = (connectionInfo.filter(conn => conn.state === 'active')).length
      idleConnections = (connectionInfo.filter(conn => conn.state === 'idle')).length
    }

    const resp = {
      'git': process.env.GIT_SHA,
      connectionStatus: {
        total: numConnections,
        active: activeConnections,
        idle: idleConnections
      },
      maxConnections: maxConnections
    }

    if (verbose) { resp.connectionInfo = connectionInfo }

    return (numConnections >= maxConnections) ? errorResponseServerError(resp) : successResponse(resp)
  }))

  app.get('/version', handleResponse(async (req, res) => {
    if (config.get('isReadOnlyMode')) {
      return errorResponseServerError()
    }

    const info = {
      ...versionInfo,
      country: config.get('serviceCountry'),
      latitude: config.get('serviceLatitude'),
      longitude: config.get('serviceLongitude')
    }
    return successResponse(info)
  }))

  /**
   * Exposes current and max disk usage stats.
   * Returns error if max disk usage exceeded, else success.
   */
  app.get('/disk_check', handleResponse(async (req, res) => {
    const maxUsageBytes = parseInt(req.query.maxUsageBytes)
    const maxUsagePercent = parseInt(req.query.maxUsagePercent) || MAX_DISK_USAGE_PERCENT

    const storagePath = DiskManager.getConfigStoragePath()
    const total = await getMonitor(MONITORS.STORAGE_PATH_SIZE)
    const used = await getMonitor(MONITORS.STORAGE_PATH_USED)
    const available = total - used

    const usagePercent = Math.round(used * 100 / total)

    const resp = {
      available: _formatBytes(available),
      total: _formatBytes(total),
      usagePercent: `${usagePercent}%`,
      maxUsagePercent: `${maxUsagePercent}%`,
      storagePath
    }

    if (maxUsageBytes) { resp.maxUsage = _formatBytes(maxUsageBytes) }

    if (usagePercent >= maxUsagePercent ||
      (maxUsageBytes && (total - available) >= maxUsageBytes)
    ) {
      return errorResponseServerError(resp)
    } else {
      return successResponse(resp)
    }
  }))
}

function _formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
