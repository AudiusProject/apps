const webpush = require('web-push')
const config = require('./config')
const models = require('./models')
const apn = require('apn')
const fs = require('fs')
const path = require('path')
const { logger } = require('./logging')

// Configure webpush for browser push to Push API enabled browsers
const vapidKeys = {
  publicKey: config.get('browserPushVapidPublicKey'),
  privateKey: config.get('browserPushVapidPrivateKey')
}
const browserPushGCMAPIKey = config.get('browserPushGCMAPIKey')
let webPushIsConfigured = false

if (vapidKeys.publicKey && vapidKeys.privateKey && browserPushGCMAPIKey) {
  webpush.setGCMAPIKey(browserPushGCMAPIKey)
  webpush.setVapidDetails(
    'mailto:contact@audius.co',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  )
  webPushIsConfigured = true
} else {
  logger.warn(
    'Web Push is not configured. Browser Push API Notifs will NOT be sent'
  )
}

/**
 * Sends a browser push notification using Google Cloud Messaging
 * Each browser subscribed to the notification will be sent a message
 * If there is an error sending b/c of an invalid token/endpoint, delete the subscription
 */
const sendBrowserNotification = async ({ userId, notificationParams }) => {
  let numSentNotifs = 0

  try {
    if (!webPushIsConfigured) return numSentNotifs
    const { message, title } = notificationParams
    const notificationBrowsers =
      await models.NotificationBrowserSubscription.findAll({
        where: { userId, enabled: true }
      })
    await Promise.all(
      notificationBrowsers.map(async (notificationBrowser) => {
        const pushSubscription = {
          endpoint: notificationBrowser.endpoint,
          keys: {
            p256dh: notificationBrowser.p256dhKey,
            auth: notificationBrowser.authKey
          }
        }
        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({ message, title: `${title} • Audius` })
          )
          numSentNotifs++
        } catch (err) {
          if (err.statusCode === 410) {
            // If the send Notification response was not successful
            // delete the browser subscription as it is no longer valid
            await notificationBrowser.destroy()
          }
        }
      })
    )
  } catch (err) {
    logger.error(`Error in sending Push API browser notifications`)
  }

  return numSentNotifs
}

// Configure APN for browser push notifs to safari
const apnAuthKey = config.get('apnAuthKey').replace(/\\n/g, '\n')
const apnAuthKeyPath = path.resolve(
  __dirname,
  './notifications/browserPush/audius.pushpackage/AuthKey.p8'
)
if (apnAuthKey) {
  fs.writeFileSync(apnAuthKeyPath, apnAuthKey)
}
const apnTopic = 'web.co.audius'

const apnConfig = {
  token: {
    key: apnAuthKeyPath,
    keyId: config.get('apnKeyId'),
    teamId: config.get('apnTeamId')
  },
  production: true
}

let apnProvider
if (
  apnConfig.token.keyId &&
  apnConfig.token.teamId &&
  fs.existsSync(apnConfig.token.key)
) {
  apnProvider = new apn.Provider(apnConfig)
} else {
  logger.warn(
    'APN Provider is not configured. Safari Push Notifs will NOT be sent'
  )
}

/**
 * Sends a safari browser push notification using APNs
 * Each browser subscribed to the notification will be sent a message
 * If there is a BadTokenDevice error, remove the browser devicetoken
 */
const sendSafariNotification = async ({ userId, notificationParams }) => {
  let numSentNotifs = 0

  try {
    if (!apnProvider) return numSentNotifs
    const note = new apn.Notification()

    const { message, title } = notificationParams

    note.topic = apnTopic // Required: The destination topic for the notification.
    note.pushType = 'alert' // Required: alert or background
    note.expiry = Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now.
    note.alert = { title: `${title} • Audius`, body: message }
    note.urlArgs = []
    note.payload = {}

    const notifcationDevices = await models.NotificationDeviceToken.findAll({
      where: { userId, enabled: true, deviceType: 'safari' }
    })
    await Promise.all(
      notifcationDevices.map(async (notificationDevice) => {
        try {
          const result = await apnProvider.send(
            note,
            notificationDevice.deviceToken
          )
          if (result.failed && result.failed.length > 0) {
            for (const failed of result.failed) {
              if (
                failed.response &&
                failed.response.reason === 'BadDeviceToken'
              ) {
                // TODO: Remove device token
                await models.NotificationDeviceToken.destroy({
                  where: {
                    userId,
                    deviceToken: notificationDevice.deviceToken,
                    deviceType: 'safari'
                  }
                })
              }
            }
          } else {
            numSentNotifs++
          }
        } catch (err) {
          logger.error(
            `Error sending browser notification to APNs w/ device token: ${notificationDevice.deviceToken}`
          )
        }
      })
    )
  } catch (err) {
    logger.error(`Error in sending safari push notifications`)
  }

  return numSentNotifs
}

module.exports.sendBrowserNotification = sendBrowserNotification
module.exports.sendSafariNotification = sendSafariNotification
