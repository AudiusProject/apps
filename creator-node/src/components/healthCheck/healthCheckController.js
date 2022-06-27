const os = require('os')
const express = require('express')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  handleResponseWithHeartbeat,
  sendResponse,
  errorResponseServerError
} = require('../../apiHelpers')
const {
  healthCheck,
  healthCheckVerbose,
  healthCheckDuration
} = require('./healthCheckComponentService')
const { syncHealthCheck } = require('./syncHealthCheckComponentService')
const { serviceRegistry } = require('../../serviceRegistry')
const { sequelize } = require('../../models')
const { getMonitors } = require('../../monitors/monitors')
const TranscodingQueue = require('../../TranscodingQueue')

const { recoverWallet } = require('../../apiSigning')
const {
  handleTrackContentUpload,
  removeTrackFolder
} = require('../../fileManager')

const config = require('../../config')

const router = express.Router()

// 5 minutes in ms is the maximum age of a timestamp sent to /health_check/duration
const MAX_HEALTH_CHECK_TIMESTAMP_AGE_MS = 300000
const numberOfCPUs = os.cpus().length

const MONITOR_STATE_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS = config.get(
  'monitorStateJobLastSuccessfulRunDelayMs'
)
const FIND_SYNC_REQUESTS_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS = config.get(
  'findSyncRequestsJobLastSuccessfulRunDelayMs'
)
const FIND_REPLICA_SET_UPDATES_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS =
  config.get('findReplicaSetUpdatesJobLastSuccessfulRunDelayMs')

// Helper Functions
/**
 * Verifies that the request is made by the delegate Owner
 */
const healthCheckVerifySignature = (req, res, next) => {
  const { timestamp, randomBytes, signature } = req.query
  if (!timestamp || !randomBytes || !signature) {
    return sendResponse(
      req,
      res,
      errorResponseBadRequest('Missing required query parameters')
    )
  }

  const recoveryObject = { randomBytesToSign: randomBytes, timestamp }
  const recoveredPublicWallet = recoverWallet(
    recoveryObject,
    signature
  ).toLowerCase()
  const recoveredTimestampDate = new Date(timestamp)
  const currentTimestampDate = new Date()
  const requestAge = currentTimestampDate - recoveredTimestampDate
  if (requestAge >= MAX_HEALTH_CHECK_TIMESTAMP_AGE_MS) {
    return sendResponse(
      req,
      res,
      errorResponseBadRequest(
        `Submitted timestamp=${recoveredTimestampDate}, current timestamp=${currentTimestampDate}. Maximum age =${MAX_HEALTH_CHECK_TIMESTAMP_AGE_MS}`
      )
    )
  }
  const delegateOwnerWallet = config.get('delegateOwnerWallet').toLowerCase()
  if (recoveredPublicWallet !== delegateOwnerWallet) {
    return sendResponse(
      req,
      res,
      errorResponseBadRequest(
        "Requester's public key does does not match Creator Node's delegate owner wallet."
      )
    )
  }

  next()
}

// Controllers

/**
 * Controller for `health_check` route, calls
 * `healthCheckComponentService`.
 */
const healthCheckController = async (req) => {
  if (config.get('isReadOnlyMode')) {
    return errorResponseServerError()
  }

  const { randomBytesToSign, enforceStateMachineQueueHealth } = req.query

  const AsyncProcessingQueue =
    req.app.get('serviceRegistry').asyncProcessingQueue

  const logger = req.logger
  const response = await healthCheck(
    serviceRegistry,
    logger,
    sequelize,
    getMonitors,
    TranscodingQueue.getTranscodeQueueJobs,
    TranscodingQueue.isAvailable,
    AsyncProcessingQueue.getAsyncProcessingQueueJobs,
    numberOfCPUs,
    randomBytesToSign
  )

  const {
    latestMonitorStateJobSuccess,
    latestFindSyncRequestsJobSuccess,
    latestFindReplicaSetUpdatesJobSuccess
  } = response
  if (enforceStateMachineQueueHealth && latestMonitorStateJobSuccess) {
    // Enforce time since last successful monitor-state job
    response.monitorStateJobLastSuccessfulRunDelayMs =
      MONITOR_STATE_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    const monitorStateDelta =
      Date.now() - new Date(latestMonitorStateJobSuccess).getTime()
    if (
      monitorStateDelta > MONITOR_STATE_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    ) {
      return errorResponseServerError(
        `monitor-state job not healthy - last successful run ${monitorStateDelta}ms ago not within healthy threshold of ${MONITOR_STATE_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS}ms`
      )
    }

    // Enforce time since last successful find-sync-requests job
    response.findSyncRequestsJobLastSuccessfulRunDelayMs =
      FIND_SYNC_REQUESTS_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    const findSyncRequestsDelta =
      Date.now() - new Date(latestFindSyncRequestsJobSuccess).getTime()
    if (
      findSyncRequestsDelta >
      FIND_SYNC_REQUESTS_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    ) {
      return errorResponseServerError(
        `find-sync-requests job not healthy - last successful run ${findSyncRequestsDelta}ms ago not within healthy threshold of ${FIND_SYNC_REQUESTS_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS}ms`
      )
    }

    // Enforce time since last successful find-replica-set-updates job
    response.findReplicaSetUpdatesJobLastSuccessfulRunDelayMs =
      FIND_REPLICA_SET_UPDATES_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    const findReplicaSetUpdatesDelta =
      Date.now() - new Date(latestFindReplicaSetUpdatesJobSuccess).getTime()
    if (
      findReplicaSetUpdatesDelta >
      FIND_REPLICA_SET_UPDATES_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS
    ) {
      return errorResponseServerError(
        `find-replica-set-updates job not healthy - last successful run ${findReplicaSetUpdatesDelta}ms ago not within healthy threshold of ${FIND_REPLICA_SET_UPDATES_JOB_MAX_LAST_SUCCESSFUL_RUN_DELAY_MS}ms`
      )
    }
  }

  return successResponse(response)
}

/**
 * Controller for `health_check/sync` route, calls
 * syncHealthCheckController
 */
const syncHealthCheckController = async (req) => {
  const response = await syncHealthCheck(serviceRegistry)

  const prometheusRegistry = req.app.get('serviceRegistry').prometheusRegistry
  const syncQueueJobsTotalMetric = prometheusRegistry.getMetric(
    prometheusRegistry.metricNames.SYNC_QUEUE_JOBS_TOTAL_GAUGE
  )
  syncQueueJobsTotalMetric.set(
    { status: 'manual_waiting' },
    response.manualWaitingCount
  )
  syncQueueJobsTotalMetric.set(
    { status: 'recurring_waiting' },
    response.recurringWaitingCount
  )

  return successResponse(response)
}

/**
 * Controller for health_check/duration route
 * Calls healthCheckComponentService
 */
const healthCheckDurationController = async (req) => {
  const response = await healthCheckDuration()
  return successResponse(response)
}

/**
 * Controller for `health_check/verbose` route
 * Calls `healthCheckComponentService`.
 *
 * @todo Add disk usage, current load, and/or node details to response.
 * Will be used for cnode selection.
 */
const healthCheckVerboseController = async (req) => {
  if (config.get('isReadOnlyMode')) {
    return errorResponseServerError()
  }

  const AsyncProcessingQueue =
    req.app.get('serviceRegistry').asyncProcessingQueue

  const logger = req.logger
  const healthCheckResponse = await healthCheckVerbose(
    serviceRegistry,
    logger,
    sequelize,
    getMonitors,
    numberOfCPUs,
    TranscodingQueue.getTranscodeQueueJobs,
    TranscodingQueue.isAvailable,
    AsyncProcessingQueue.getAsyncProcessingQueueJobs
  )

  return successResponse({
    ...healthCheckResponse
  })
}

/**
 * Controller for `health_check/fileupload` route *
 * Perform a file upload health check limited to configured delegateOwnerWallet.
 * This prunes the disc artifacts created by the process after.
 */
const healthCheckFileUploadController = async (req) => {
  const err =
    req.fileFilterError ||
    req.fileSizeError ||
    (await removeTrackFolder(req, req.fileDir))
  if (err) {
    return errorResponseServerError(err)
  }
  return successResponse({ success: true })
}

// Routes

router.get('/health_check', handleResponse(healthCheckController))
router.get('/health_check/sync', handleResponse(syncHealthCheckController))
router.get(
  '/health_check/duration',
  healthCheckVerifySignature,
  handleResponse(healthCheckDurationController)
)
router.get(
  '/health_check/duration/heartbeat',
  healthCheckVerifySignature,
  handleResponseWithHeartbeat(healthCheckDurationController)
)
router.get(
  '/health_check/verbose',
  handleResponse(healthCheckVerboseController)
)
router.post(
  '/health_check/fileupload',
  healthCheckVerifySignature,
  handleTrackContentUpload,
  handleResponseWithHeartbeat(healthCheckFileUploadController)
)

module.exports = router
