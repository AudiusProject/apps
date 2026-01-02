const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const models = require('../models')
const config = require('../config')
const { createPlatformEndpoint, deleteEndpoint } = require('../awsSNS')
const path = require('path')
const fs = require('fs')

const iOSSNSParams = {
  PlatformApplicationArn: config.get('awsSNSiOSARN')
}

const androidSNSParams = {
  PlatformApplicationArn: config.get('awsSNSAndroidARN')
}

const IOS = 'ios'
const ANDROID = 'android'
const SAFARI = 'safari'
const DEVICE_TYPES = new Set([IOS, ANDROID, SAFARI])

// A signed Push Pacakge zip is required for safari browser push notifications
let pushPackageName = ''
const environment = config.get('environment')
if (environment === 'development') {
  pushPackageName = 'devPushPackage.zip'
} else {
  pushPackageName = 'productionPushPackage.zip'
}
const pushPackagePath = path.join(
  __dirname,
  `../notifications/browserPush/${pushPackageName}`
)

/**
 * Checks if a browser Push API subscription is valid for notifications
 * @params {Object} subscription
 */
const isValidBrowserSubscription = (subscription) => {
  return (
    subscription &&
    subscription.endpoint &&
    subscription.keys &&
    subscription.keys.p256dh &&
    subscription.keys.auth
  )
}

module.exports = function (app) {
  /**
   * Get the settings for mobile push notifications for a user
   */
  app.get(
    '/push_notifications/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId

      if (!userId)
        return errorResponseBadRequest(`Did not pass in a valid userId`)

      try {
        const settings = await models.UserNotificationMobileSettings.findOne({
          where: { userId }
        })
        return successResponse({ settings })
      } catch (e) {
        req.logger.error(
          `Unable to find push notification settings for userId: ${userId}`,
          e
        )
        return errorResponseServerError(
          `Unable to find push notification settings for userId: ${userId}, Error: ${e.message}`
        )
      }
    })
  )

  /**
   * Create or update mobile push notification settings
   * POST body contains {userId, settings: {favorites, milestonesAndAchievements, reposts, announcements, followers}}
   */
  app.post(
    '/push_notifications/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { settings } = req.body

      if (!userId)
        return errorResponseBadRequest(`Did not pass in a valid userId`)

      try {
        // pseudo-upsert without sequlize magic
        const userSettings =
          await models.UserNotificationMobileSettings.findOne({
            where: { userId }
          })
        if (userSettings) {
          await userSettings.update({ ...settings })
        } else {
          await models.UserNotificationMobileSettings.create({
            userId,
            ...settings
          })
        }

        return successResponse()
      } catch (e) {
        req.logger.error(
          `Unable to create or update push notification settings for userId: ${userId}`,
          e
        )
        return errorResponseServerError(
          `Unable to create or update push notification settings for userId: ${userId}, Error: ${e.message}`
        )
      }
    })
  )

  /**
   * Register a device token
   * POST body contains {deviceToken: <string>, deviceType: ios/android/safari }
   */
  app.post(
    '/push_notifications/device_token',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { deviceToken, deviceType } = req.body

      if (!DEVICE_TYPES.has(deviceType)) {
        return errorResponseBadRequest(
          'Attempting to register an invalid deviceType'
        )
      }
      if (!deviceToken || !userId) {
        return errorResponseBadRequest(
          'Did not pass in a valid deviceToken or userId for device token registration'
        )
      }

      try {
        // Build the aws sns platform params based on device type
        let params = { Token: deviceToken }
        if (deviceType === IOS) params = { ...iOSSNSParams, ...params }
        else if (deviceType === ANDROID)
          params = { ...androidSNSParams, ...params }

        // If native moblie (ios/android), register the device with aws sns
        if (deviceType !== SAFARI) {
          const awsARN = (await createPlatformEndpoint(params)).EndpointArn
          await models.NotificationDeviceToken.upsert({
            deviceToken,
            deviceType,
            userId,
            awsARN
          })
        } else {
          await models.NotificationDeviceToken.upsert({
            deviceToken,
            deviceType,
            userId
          })
        }

        return successResponse()
      } catch (e) {
        req.logger.error(
          `Unable to register device token for userId: ${userId} on ${deviceType}`,
          e
        )
        return errorResponseServerError(
          `Unable to register device token for userId: ${userId} on ${deviceType}, Error: ${e.message}`
        )
      }
    })
  )

  /**
   * Remove a device token from the device token table
   * POST body contains {deviceToken}
   */
  app.post(
    '/push_notifications/device_token/deregister',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { deviceToken } = req.body

      if (!deviceToken) {
        return errorResponseBadRequest(
          'Did not pass in a valid deviceToken or userId for device token registration'
        )
      }

      let tokenDeleted = false
      try {
        // delete device token
        const tokenObj = await models.NotificationDeviceToken.findOne({
          where: {
            deviceToken,
            userId
          }
        })

        if (tokenObj) {
          // delete the endpoint from AWS SNS
          if (tokenObj.awsARN)
            await deleteEndpoint({ EndpointArn: tokenObj.awsARN })
          await tokenObj.destroy()
          tokenDeleted = true
        }

        return successResponse({ tokenDeleted })
      } catch (e) {
        req.logger.error(
          `Unable to deregister device token for deviceToken: ${deviceToken}`,
          e
        )
        return errorResponseServerError(
          `Unable to deregister device token for deviceToken: ${deviceToken}`,
          e.message
        )
      }
    })
  )

  /**
   * Checks if a device token/type exists for a userId
   * Get query must include {deviceToken: <string>, deviceType: ios/android/safari }
   */
  app.get(
    '/push_notifications/device_token/enabled',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { deviceToken, deviceType } = req.query
      if (!DEVICE_TYPES.has(deviceType)) {
        return errorResponseBadRequest(
          'Attempting to check for an invalid deviceType'
        )
      }
      if (!deviceToken || !userId) {
        return errorResponseBadRequest(
          'Did not pass in a valid deviceToken or userId for device token check'
        )
      }

      try {
        const notificationDeviceToken =
          await models.NotificationDeviceToken.findOne({
            where: {
              deviceToken,
              deviceType,
              userId
            }
          })
        const enabled =
          (notificationDeviceToken && notificationDeviceToken.enabled) || false
        return successResponse({ enabled })
      } catch (e) {
        req.logger.error(
          `Unable to register device token for userId: ${userId} on ${deviceType}`,
          e
        )
        return errorResponseServerError(
          `Unable to register device token for userId: ${userId} on ${deviceType}, Error: ${e.message}`
        )
      }
    })
  )

  /**
   * Get the settings for browser push notifications for a user
   */
  app.get(
    '/push_notifications/browser/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId

      if (!userId)
        return errorResponseBadRequest(`Did not pass in a valid userId`)

      try {
        const [settings] =
          await models.UserNotificationBrowserSettings.findOrCreate({
            where: { userId }
          })
        return successResponse({ settings })
      } catch (e) {
        req.logger.error(
          `Unable to find browser push notification settings for userId: ${userId}`,
          e
        )
        return errorResponseServerError(
          `Unable to find browser push notification settings for userId: ${userId}, Error: ${e.message}`
        )
      }
    })
  )

  /**
   * Create or update browser push notification settings
   * POST body contains {userId, settings: {favorites, milestonesAndAchievements, reposts, followers}}
   */
  app.post(
    '/push_notifications/browser/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { settings } = req.body

      if (!userId)
        return errorResponseBadRequest(`Did not pass in a valid userId`)

      try {
        const browserSettings =
          await models.UserNotificationBrowserSettings.upsert({
            ...settings,
            userId
          })

        return successResponse({ settings: browserSettings })
      } catch (e) {
        req.logger.error(
          `Unable to create or update browser push notification settings for userId: ${userId}`,
          e
        )
        return errorResponseServerError(
          `Unable to create or update browser push notification settings for userId: ${userId}, Error: ${e.message}`
        )
      }
    })
  )

  /*
   * Returns if a user browser subscription exists and is enabled
   */
  app.get(
    '/push_notifications/browser/enabled',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      const { endpoint } = req.query
      if (!endpoint) {
        return errorResponseBadRequest(
          'Invalid request parameters, endpoint required'
        )
      }

      try {
        const subscription =
          await models.NotificationBrowserSubscription.findOne({
            where: { userId, endpoint },
            attributes: ['enabled']
          })

        const enabled = (subscription && subscription.enabled) || false
        return successResponse({ enabled })
      } catch (e) {
        return errorResponseServerError(
          `Unable to get browser push notificaiton enabled`,
          e.message
        )
      }
    })
  )

  /*
   * Creates/Updates a user browser notification bscription exists
   */
  app.post(
    '/push_notifications/browser/register',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const { subscription, enabled = true } = req.body
      if (!isValidBrowserSubscription(subscription)) {
        return errorResponseBadRequest('Invalid request parameters')
      }

      try {
        await models.NotificationBrowserSubscription.upsert({
          userId: req.user.blockchainUserId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          enabled
        })
        return successResponse()
      } catch (e) {
        return errorResponseServerError(
          `Unable to save browser push notificaiton subscription`,
          e.message
        )
      }
    })
  )

  /*
   * Deletes the browser notification subscription.
   */
  app.post(
    '/push_notifications/browser/deregister',
    handleResponse(async (req, res, next) => {
      const { subscription } = req.body
      if (!isValidBrowserSubscription(subscription)) {
        return errorResponseBadRequest('Invalid request parameters')
      }

      try {
        await models.NotificationBrowserSubscription.destroy({
          where: {
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth
          }
        })
        return successResponse()
      } catch (e) {
        return errorResponseServerError(
          `Unable to deregister push browser subscription`,
          e.message
        )
      }
    })
  )

  /*
   * Downloads the signed safari web push package for authentication.
   */
  app.post(
    '/push_notifications/safari/:version/pushPackages/:websitePushID',
    (req, res) => {
      try {
        res.writeHead(200, {
          'Content-Type': 'application/zip'
        })

        const readStream = fs.createReadStream(pushPackagePath)
        readStream.pipe(res)
      } catch (e) {
        return errorResponseServerError(
          `Unable to send safari push package`,
          e.message
        )
      }
    }
  )

  /*
   * Registering or Updating Device Permission Policy
   * When users first grant permission, or later change their permission levels for your website, a POST request is sent to the following URL:
   * NOTE: the deviceToken is also accessible in the client, and sent as part of the device_token/register endpoint w/ additional data
   */
  app.post(
    '/push_notifications/safari/:version/devices/:deviceToken/registrations/:websitePushID',
    handleResponse(async (req, res, next) => {
      try {
        return successResponse({})
      } catch (e) {
        return errorResponseServerError(
          `Unable to save safari browser push notificaiton subscription`,
          e.message
        )
      }
    })
  )

  /*
   * Forgetting Device Permission Policy
   * If a user removes permission of a website in Safari preferences, a DELETE request is sent to the following URL:
   * This is done by the safari browser, but the client redundently send a request to device_token/deregister
   */
  app.delete(
    '/push_notifications/safari/:version/devices/:deviceToken/registrations/:websitePushID',
    handleResponse(async (req, res, next) => {
      const { deviceToken } = req.body

      if (!deviceToken) {
        return errorResponseBadRequest(
          'Did not pass in a valid deviceToken or userId for device token registration'
        )
      }

      try {
        // delete device token
        await models.NotificationDeviceToken.destroy({
          where: { deviceToken }
        })
        return successResponse()
      } catch (e) {
        return errorResponseServerError(
          `Unable to delete browser push notificaiton devicetoken`,
          e.message
        )
      }
    })
  )

  /*
   * Logging Errors
   * If an error occurs, a POST request is sent to the following URL:
   */
  app.post(
    '/push_notifications/safari/:version/log',
    handleResponse(async (req, res, next) => {
      // TODO: Download website package
      req.logger.info(JSON.stringify(req.body, null, ''))
      try {
        return successResponse()
      } catch (e) {
        return errorResponseServerError(
          `Unable to log safari push notification`,
          e.message
        )
      }
    })
  )
}
