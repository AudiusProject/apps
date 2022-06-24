const config = require('../../../config')
const NodeHealthManager = require('../CNodeHealthManager')
const {
  getNodeUsers,
  buildReplicaSetNodesToUserWalletsMap,
  computeUserSecondarySyncSuccessRatesMap
} = require('./stateMonitoringUtils')
const { retrieveUserInfoFromReplicaSet } = require('../stateMachineUtils')
const { QUEUE_NAMES, JOB_NAMES } = require('../stateMachineConstants')

// Number of users to process each time processStateMonitoringJob is called
const USERS_PER_JOB = config.get('snapbackUsersPerJob')
const THIS_CNODE_ENDPOINT = config.get('creatorNodeEndpoint')

/**
 * Processes a job to monitor the current state of `USERS_PER_JOB` users.
 * Returns state data for the slice of users processed and the Content Nodes affiliated with them.
 *
 * @param {Object} param job data
 * @param {Object} param.logger the logger that can be filtered by jobName and jobId
 * @param {number} param.lastProcessedUserId the highest ID of the user that was most recently processed
 * @param {string} param.discoveryNodeEndpoint the IP address / URL of a Discovery Node to make requests to
 * @return {Object} object containing an array of jobs to add to the state monitoring queue
 */
module.exports = async function ({
  logger,
  lastProcessedUserId,
  discoveryNodeEndpoint
}) {
  _validateJobData(logger, lastProcessedUserId, discoveryNodeEndpoint)

  // Record all stages of this function along with associated information for use in logging
  const decisionTree = []
  _addToDecisionTree(decisionTree, 'BEGIN processStateMonitoringJob', logger, {
    lastProcessedUserId,
    discoveryNodeEndpoint,
    THIS_CNODE_ENDPOINT,
    USERS_PER_JOB
  })

  let users = []
  let unhealthyPeers = new Set()
  let replicaToUserInfoMap = {}
  let userSecondarySyncMetricsMap = {}
  try {
    try {
      users = await getNodeUsers(
        discoveryNodeEndpoint,
        THIS_CNODE_ENDPOINT,
        lastProcessedUserId,
        USERS_PER_JOB
      )

      _addToDecisionTree(
        decisionTree,
        'getNodeUsers and sliceUsers Success',
        logger,
        { usersLength: users?.length }
      )
    } catch (e) {
      // Make the next job try again instead of looping back to userId 0
      users = [{ user_id: lastProcessedUserId }]

      _addToDecisionTree(
        decisionTree,
        'getNodeUsers or sliceUsers Error',
        logger,
        { error: e.message }
      )
      throw new Error(
        `processStateMonitoringJob getNodeUsers or sliceUsers Error: ${e.toString()}`
      )
    }

    try {
      unhealthyPeers = await NodeHealthManager.getUnhealthyPeers(users)
      _addToDecisionTree(decisionTree, 'getUnhealthyPeers Success', logger, {
        unhealthyPeerSetLength: unhealthyPeers?.size,
        unhealthyPeers: Array.from(unhealthyPeers)
      })
    } catch (e) {
      _addToDecisionTree(
        decisionTree,
        'processStateMonitoringJob getUnhealthyPeers Error',
        logger,
        { error: e.message }
      )
      throw new Error(
        `processStateMonitoringJob getUnhealthyPeers Error: ${e.toString()}`
      )
    }

    // Build map of <replica set node : [array of wallets that are on this replica set node]>
    const replicaSetNodesToUserWalletsMap =
      buildReplicaSetNodesToUserWalletsMap(users)
    _addToDecisionTree(
      decisionTree,
      'buildReplicaSetNodesToUserWalletsMap Success',
      logger,
      {
        numReplicaSetNodes: Object.keys(replicaSetNodesToUserWalletsMap)?.length
      }
    )

    // Retrieve user info for all users and their current replica sets
    try {
      const retrieveUserInfoResp = await retrieveUserInfoFromReplicaSet(
        replicaSetNodesToUserWalletsMap
      )
      replicaToUserInfoMap = retrieveUserInfoResp.replicaToUserInfoMap

      // Mark peers as unhealthy if they were healthy before but failed to return a clock value
      unhealthyPeers = new Set([
        ...unhealthyPeers,
        ...retrieveUserInfoResp.unhealthyPeers
      ])

      _addToDecisionTree(
        decisionTree,
        'retrieveUserInfoFromReplicaSet Success',
        logger
      )
    } catch (e) {
      _addToDecisionTree(
        decisionTree,
        'retrieveUserInfoFromReplicaSet Error',
        logger,
        { error: e.message }
      )
      throw new Error(
        'processStateMonitoringJob retrieveUserInfoFromReplicaSet Error'
      )
    }

    // Retrieve success metrics for all users syncing to their secondaries
    try {
      userSecondarySyncMetricsMap =
        await computeUserSecondarySyncSuccessRatesMap(users)
      _addToDecisionTree(
        decisionTree,
        'computeUserSecondarySyncSuccessRatesMap Success',
        logger,
        {
          userSecondarySyncMetricsMapLength: Object.keys(
            userSecondarySyncMetricsMap
          )?.length
        }
      )
    } catch (e) {
      _addToDecisionTree(
        decisionTree,
        'computeUserSecondarySyncSuccessRatesMap Error',
        logger,
        { error: e.message }
      )
      throw new Error(
        'processStateMonitoringJob computeUserSecondarySyncSuccessRatesMap Error'
      )
    }
  } catch (e) {
    logger.info(`processStateMonitoringJob ERROR: ${e.toString()}`)
  } finally {
    _addToDecisionTree(decisionTree, 'END processStateMachineOperation', logger)

    // Log decision tree
    _printDecisionTree(decisionTree, logger)
  }

  // The next job should start processing where this one ended or loop back around to the first user
  const lastProcessedUser = users[users.length - 1] || {
    user_id: 0
  }
  return {
    jobsToEnqueue: {
      [QUEUE_NAMES.STATE_MONITORING]: [
        // Enqueue findFindSyncRequests and findReplicaSetUpdates jobs to find which state anomalies
        // need to be reconciled for the slice of users we just monitored
        {
          jobName: JOB_NAMES.FIND_SYNC_REQUESTS,
          jobData: {
            users,
            unhealthyPeers: Array.from(unhealthyPeers), // Bull messes up passing a Set
            replicaToUserInfoMap,
            userSecondarySyncMetricsMap
          }
        },
        {
          jobName: JOB_NAMES.FIND_REPLICA_SET_UPDATES,
          jobData: {
            users,
            unhealthyPeers: Array.from(unhealthyPeers), // Bull messes up passing a Set
            replicaToUserInfoMap,
            userSecondarySyncMetricsMap
          }
        },
        // Enqueue another monitorState job to monitor the next slice of users
        {
          jobName: JOB_NAMES.MONITOR_STATE,
          jobData: {
            lastProcessedUserId: lastProcessedUser?.user_id || 0,
            discoveryNodeEndpoint
          }
        }
      ]
    }
  }
}

const _validateJobData = (
  logger,
  lastProcessedUserId,
  discoveryNodeEndpoint
) => {
  if (typeof logger !== 'object') {
    throw new Error(
      `Invalid type ("${typeof logger}") or value ("${logger}") of logger param`
    )
  }
  if (typeof lastProcessedUserId !== 'number') {
    throw new Error(
      `Invalid type ("${typeof lastProcessedUserId}") or value ("${lastProcessedUserId}") of lastProcessedUserId`
    )
  }
  if (typeof discoveryNodeEndpoint !== 'string') {
    throw new Error(
      `Invalid type ("${typeof discoveryNodeEndpoint}") or value ("${discoveryNodeEndpoint}") of discoveryNodeEndpoint`
    )
  }
}

const _addToDecisionTree = (decisionTree, stage, logger, data = {}) => {
  const obj = { stage, data, time: Date.now() }

  let logStr = `monitorState.jobProcessor ${stage} - Data ${JSON.stringify(
    data
  )}`

  if (decisionTree.length > 0) {
    // Set duration if both objs have time field
    const lastObj = decisionTree[decisionTree.length - 1]
    if (lastObj && lastObj.time) {
      const duration = obj.time - lastObj.time
      obj.duration = duration
      logStr += ` - Duration ${duration}ms`
    }
  }
  decisionTree.push(obj)

  if (logger) {
    logger.info(logStr)
  }
}

const _printDecisionTree = (decisionTree, logger) => {
  // Compute and record `fullDuration`
  if (decisionTree.length > 2) {
    const startTime = decisionTree[0].time
    const endTime = decisionTree[decisionTree.length - 1].time
    const duration = endTime - startTime
    decisionTree[decisionTree.length - 1].fullDuration = duration
  }
  try {
    logger.info(
      `monitorState.jobProcessor Decision Tree${JSON.stringify(decisionTree)}`
    )
  } catch (e) {
    logger.error(
      `Error printing monitorState.jobProcessor Decision Tree ${decisionTree}`
    )
  }
}
