const moment = require('moment')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest
} = require('../apiHelpers')
const models = require('../models')
const authMiddleware = require('../authMiddleware')

module.exports = function (app) {
  /**
   * Updates fields for a user's settings (or creates the settings w/ db defaults if not created)
   * postBody: {object} settings      Identitifies if the notification is to be marked as read
   *
   */
  app.post(
    '/notifications/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const { settings } = req.body
      if (typeof settings === 'undefined') {
        return errorResponseBadRequest('Invalid request body')
      }

      try {
        await models.UserNotificationSettings.upsert({
          userId: req.user.blockchainUserId,
          ...settings
        })
        return successResponse({ message: 'success' })
      } catch (err) {
        return errorResponseBadRequest({
          message: `[Error] Unable to create/update notification settings for user: ${req.user.blockchainUserId}`
        })
      }
    })
  )
  /**
   * Fetches the settings for a given userId
   */
  app.get(
    '/notifications/settings',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const userId = req.user.blockchainUserId
      try {
        await models.sequelize.query(
          `
            INSERT INTO "UserNotificationSettings" ("userId", "updatedAt", "createdAt")
            VALUES (:userId, now(), now())
            ON CONFLICT
            DO NOTHING;
          `,
          {
            replacements: { userId }
          }
        )

        const settings = await models.UserNotificationSettings.findOne({
          where: { userId },
          attributes: [
            'favorites',
            'reposts',
            'milestonesAndAchievements',
            'announcements',
            'followers',
            'browserPushNotifications',
            'emailFrequency'
          ]
        })
        return successResponse({ settings })
      } catch (err) {
        return errorResponseBadRequest({
          message: `[Error] Unable to retrieve notification settings for user: ${userId}`
        })
      }
    })
  )
}
