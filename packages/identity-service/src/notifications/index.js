const Bull = require('bull')
const config = require('../config.js')
const models = require('../models')
const fs = require('fs')
const { logger } = require('../logging')
const { indexMilestones } = require('./milestoneProcessing')
const {
  updateBlockchainIds,
  getHighestSlot,
  getHighestBlockNumber
  // calculateTrackListenMilestones,
  // calculateTrackListenMilestonesFromDiscovery
} = require('./utils')
const { processEmailNotifications } = require('./sendNotificationEmails')
const { processDownloadAppEmail } = require('./sendDownloadAppEmails')
const {
  pushAnnouncementNotifications
} = require('./pushAnnouncementNotifications')
const {
  notificationJobType,
  solanaNotificationJobType,
  announcementJobType,
  unreadEmailJobType,
  downloadEmailJobType
} = require('./constants')
const {
  drainPublishedMessages,
  drainPublishedSolanaMessages
} = require('./notificationQueue')
const emailCachePath = './emailCache'
const processNotifications = require('./processNotifications/index.js')
const sendNotifications = require('./sendNotifications/index.js')
const audiusLibsWrapper = require('../audiusLibsInstance')

const NOTIFICATION_ANNOUNCEMENTS_INTERVAL_SEC = 30 * 1000

const NOTIFICATION_JOB_LAST_SUCCESS_KEY = 'notifications:last-success'
const NOTIFICATION_SOLANA_JOB_LAST_SUCCESS_KEY =
  'notifications:solana:last-success'
const NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY =
  'notifications:emails:last-success'
const NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY =
  'notifications:announcements:last-success'
const NOTIFICATION_DOWNLOAD_EMAIL_JOB_LAST_SUCCESS_KEY =
  'notifications:download-emails:last-success'

// Reference Bull Docs: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queue
const defaultJobOptions = {
  removeOnComplete: true,
  removeOnFail: true
}

const bullSettings = {
  lockDuration: 60 /** min */ * 60 /** sec */ * 1000 /** ms */,
  maxStalledCount: 0
}

class NotificationProcessor {
  constructor({ errorHandler }) {
    this.downloadEmailQueue = new Bull(`download-email-queue-${Date.now()}`, {
      redis: {
        port: config.get('redisPort'),
        host: config.get('redisHost')
      },
      defaultJobOptions
    })
    if (errorHandler) {
      this.errorHandler = errorHandler
    } else {
      this.errorHandler = () => null
    }
  }

  /**
   * Initialize notification and milestone processing
   * 1. Clear the notifQueue and emailQueue
   * 2. Update all blockchainId's in the users table where blockchainId is null
   * 3. Process notif queue and recursively add notif job on queue after 3 seconds
   *    Process email queue and recursively add email job on queue after 3 seconds
   * @param {Object} audiusLibs libs instance
   * @param {Object} expressApp express app context
   * @param {Object} redis redis connection
   */
  async init(audiusLibs, expressApp, redis) {
    // Clear any pending notif jobs
    await this.downloadEmailQueue.empty()
    this.redis = redis
    this.mg = expressApp.get('sendgrid')

    // Index all blockchain ids
    this.idUpdateTask = updateBlockchainIds()

    // Download Email notification queue
    this.downloadEmailQueue.process(async (job) => {
      logger.debug('processDownloadEmails')
      let error = null
      try {
        await processDownloadAppEmail(expressApp, audiusLibs)
        await this.redis.set(
          NOTIFICATION_DOWNLOAD_EMAIL_JOB_LAST_SUCCESS_KEY,
          new Date().toISOString()
        )
      } catch (e) {
        error = e
        logger.error(
          `processDownloadEmails - Problem with processing emails: ${e}`
        )
        this.errorHandler(e)
      }
      await this.downloadEmailQueue.add(
        { type: downloadEmailJobType },
        { jobId: `${downloadEmailJobType}:${Date.now()}` }
      )
    })

    // Add initial jobs to the queue
    if (!fs.existsSync(emailCachePath)) {
      fs.mkdirSync(emailCachePath)
    }
    await this.downloadEmailQueue.add(
      { type: downloadEmailJobType },
      { jobId: `${downloadEmailJobType}:${Date.now()}` }
    )
  }

  /**
   * 1. Get the total listens for the most reecently listened to tracks
   * 2. Query the discprov for new notifications starting at minBlock
   * 3. Combine owner object from discprov with track listen counts
   * 4. Process notifications
   * 5. Process milestones
   * @param {AudiusLibs} audiusLibs
   * @param {OptimizelyClient} optimizelyClient
   * @param {number} minBlock min start block to start querying discprov for new notifications
   * @param {number} oldMaxBlockNumber last max black number seen
   */
  async indexAll(audiusLibs, optimizelyClient, minBlock, oldMaxBlockNumber) {
    const startDate = Date.now()
    const startTime = process.hrtime()
    let time = startDate

    logger.info(
      `notifications main indexAll job - minBlock: ${minBlock}, oldMaxBlockNumber: ${oldMaxBlockNumber}, startDate: ${startDate}, startTime: ${new Date()}`
    )

    const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()

    const trackIdOwnersToRequestList = []

    // These track_id get parameters will be used to retrieve track owner info
    // This is required since there is no guarantee that there are indeed notifications for this user
    // The owner info is then used to target listenCount milestone notifications
    // Timeout of 5 minutes
    const timeout = 5 /* min */ * 60 /* sec */ * 1000 /* ms */
    const notificationsFromDN = await discoveryProvider.getNotifications(
      minBlock,
      trackIdOwnersToRequestList,
      timeout
    )
    const { info: metadata, owners, milestones } = notificationsFromDN
    let notifications = await filterOutAbusiveUsers(
      notificationsFromDN.notifications
    )

    // Ensure we don't process any notifs
    // that are already in the db
    const latestBlock = await models.Notification.max('blocknumber')
    notifications = notifications.filter((n) => n.blocknumber >= latestBlock)

    logger.info(
      `notifications main indexAll job - query notifications from discovery node complete in ${
        Date.now() - time
      }ms`
    )
    time = Date.now()

    // Use a single transaction
    const tx = await models.sequelize.transaction()
    try {
      // Populate owners, used to index in milestone generation
      const listenCountWithOwners = []

      // Insert the notifications into the DB to make it easy for users to query for their grouped notifications
      await processNotifications(notifications, tx, optimizelyClient)
      logger.info(
        `notifications main indexAll job - processNotifications complete in ${
          Date.now() - time
        }ms`
      )
      time = Date.now()

      // Fetch additional metadata from DP, query for the user's notification settings, and send push notifications (mobile/browser)
      await sendNotifications(audiusLibs, notifications, tx, optimizelyClient)
      logger.info(
        `notifications main indexAll job - sendNotifications complete in ${
          Date.now() - time
        }ms`
      )
      time = Date.now()

      await indexMilestones(
        milestones,
        owners,
        metadata,
        listenCountWithOwners,
        audiusLibs,
        tx
      )
      logger.info(
        `notifications main indexAll job - indexMilestones complete in ${
          Date.now() - time
        }ms`
      )
      time = Date.now()

      // Commit
      await tx.commit()
      logger.info(
        `notifications main indexAll job - dbCommit complete in ${
          Date.now() - time
        }ms`
      )
      time = Date.now()

      // actually send out push notifications
      const numProcessedNotifs = await drainPublishedMessages(
        logger,
        optimizelyClient
      )
      logger.info(
        `notifications main indexAll job - drainPublishedMessages complete - processed ${numProcessedNotifs} notifs in ${
          Date.now() - time
        }ms`
      )

      const endTime = process.hrtime(startTime)
      const duration = Math.round(endTime[0] * 1e3 + endTime[1] * 1e-6)
      logger.info(
        `notifications main indexAll job finished - minBlock: ${minBlock}, startDate: ${startDate}, duration: ${duration}, notifications: ${notifications.length}`
      )
    } catch (e) {
      logger.error(
        `Error indexing notification in ${Date.now() - startDate}ms ${e}`
      )
      logger.error(e.stack)
      await tx.rollback()
    }
    return metadata.max_block_number
  }

  /**
   * Doing the solana notification things
   * @param {AudiusLibs} audiusLibs
   * @param {OptimizelyClient} optimizelyClient
   * @param {number} minSlot min slot number to start querying discprov for new notifications
   * @param {number} oldMaxSlot last max slot number seen
   */
  async indexAllSolanaNotifications(
    audiusLibs,
    optimizelyClient,
    minSlot,
    oldMaxSlot
  ) {
    const startDate = Date.now()
    const startTime = process.hrtime()
    let time = startDate
    const logLabel = 'notifications main indexAllSolanaNotifications job'

    logger.info(
      `${logLabel} - minSlot: ${minSlot}, oldMaxSlot: ${oldMaxSlot}, startDate: ${startDate}, startTime: ${startTime}`
    )

    const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()

    // Timeout of 2 minutes
    const timeout = 2 /* min */ * 60 /* sec */ * 1000 /* ms */
    const notificationsFromDN = await discoveryProvider.getSolanaNotifications(
      minSlot,
      timeout
    )
    const metadata = notificationsFromDN.info
    let notifications = await filterOutAbusiveUsers(
      notificationsFromDN.notifications
    )

    // Ensure we don't process any notifs
    // that are already in the db
    const latestSlot = await models.SolanaNotification.max('slot')
    notifications = notifications.filter((n) => n.slot >= latestSlot)

    logger.info(
      `${logLabel} - query solana notifications from discovery node complete in ${
        Date.now() - time
      }ms`
    )
    time = Date.now()

    // Use a single transaction
    const tx = await models.sequelize.transaction()
    try {
      // Insert the solana notifications into the DB
      const processedNotifications = await processNotifications(
        notifications,
        tx,
        optimizelyClient
      )
      logger.info(
        `${logLabel} - processNotifications complete in ${Date.now() - time}ms`
      )
      time = Date.now()

      // Fetch additional metadata from DP, query for the user's notification settings, and send push notifications (mobile/browser)
      await sendNotifications(
        audiusLibs,
        processedNotifications,
        tx,
        optimizelyClient
      )
      logger.info(
        `${logLabel} - sendNotifications complete in ${Date.now() - time}ms`
      )
      time = Date.now()

      // Commit
      await tx.commit()
      logger.info(`${logLabel} - dbCommit complete in ${Date.now() - time}ms`)
      time = Date.now()

      // actually send out push notifications
      const numProcessedNotifs = await drainPublishedSolanaMessages(
        logger,
        optimizelyClient
      )
      logger.info(
        `${logLabel} - drainPublishedSolanaMessages complete - processed ${numProcessedNotifs} notifs in ${
          Date.now() - time
        }ms`
      )

      const endTime = process.hrtime(startTime)
      const duration = Math.round(endTime[0] * 1e3 + endTime[1] * 1e-6)
      logger.info(
        `${logLabel} finished - minSlot: ${minSlot}, startDate: ${startDate}, duration: ${duration}, notifications: ${notifications.length}`
      )
    } catch (e) {
      logger.error(`Error indexing solana notification ${e}`)
      logger.error(e.stack)
      await tx.rollback()
    }

    return metadata.max_slot_number
  }
}

/**
 * Filters out notifications whose initiators are deemed abusive.
 * @param {Object[]} notifications
 * @returns {Promise<Object[]>} notifications - after having filtered out notifications from bad initiators
 */
async function filterOutAbusiveUsers(notifications) {
  const initiatorIds = notifications.map(({ initiator }) => initiator)
  const userEntityIds = notifications
    .filter(({ metadata }) => metadata && metadata.entity_type === 'user')
    .map(({ metadata }) => metadata.entity_id)
  const allUserIds = initiatorIds.concat(userEntityIds)
  const users = await models.User.findAll({
    where: {
      blockchainUserId: { [models.Sequelize.Op.in]: allUserIds }
    },
    attributes: [
      'blockchainUserId',
      'isBlockedFromNotifications',
      'isBlockedFromRelay'
    ]
  })
  const usersAbuseMap = {}
  users.forEach((user) => {
    usersAbuseMap[user.blockchainUserId] =
      user.isBlockedFromRelay || user.isBlockedFromNotifications
  })
  const result = notifications.filter((notification) => {
    const isInitiatorAbusive = usersAbuseMap[notification.initiator.toString()]
    const isUserEntityAbusive =
      notification.metadata &&
      notification.metadata.entity_type === 'user' &&
      notification.metadata.entity_id &&
      usersAbuseMap[notification.metadata.entity_id.toString()]
    return !isInitiatorAbusive && !isUserEntityAbusive
  })
  logger.info(
    `notifications | index.js | Filtered out ${
      notifications.length - result.length
    } bad initiators out of ${notifications.length} total.`
  )
  return result
}

module.exports = NotificationProcessor
module.exports.NOTIFICATION_JOB_LAST_SUCCESS_KEY =
  NOTIFICATION_JOB_LAST_SUCCESS_KEY
module.exports.NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY =
  NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY
module.exports.NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY =
  NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY
module.exports.NOTIFICATION_DOWNLOAD_EMAIL_JOB_LAST_SUCCESS_KEY =
  NOTIFICATION_DOWNLOAD_EMAIL_JOB_LAST_SUCCESS_KEY
