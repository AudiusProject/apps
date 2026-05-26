const sendgridClient = require('@sendgrid/client')
const axios = require('axios')
const models = require('../models')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseForbidden
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const captchaMiddleware = require('../captchaMiddleware')
const config = require('../config')
const { validateOtp, sendOtp } = require('../utils/otp')

const BOUNCER_BASE_URL = 'https://api.usebouncer.com/v1.1/email/verify'

const bouncerApiKey = config.get('bouncerEmailValidationKey')

const isEmailDeliverable = async (email, logger) => {
  try {
    const res = await axios.get(
      `${BOUNCER_BASE_URL}?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'x-api-key': bouncerApiKey
        }
      }
    )
    return res?.data?.status === 'deliverable'
  } catch (err) {
    // Couldn't figure out if deliverable, so say it was
    logger.error(`Unable to validate email for ${email}`, err)
    return true
  }
}

module.exports = function (app) {
  /**
   * Create a new user in the Users table
   * This is one part of a two part route along with POST /authentication
   * The user handle is not written here. that's added in /user/associate
   */
  app.post(
    '/user',
    captchaMiddleware,
    handleResponse(async (req, res, next) => {
      // body should contain {username, walletAddress}
      // username is actually email, but hedgehog sends username
      const body = req.body
      if (body.username && body.walletAddress) {
        const email = body.username.toLowerCase()
        const existingUser = await models.User.findOne({
          where: {
            email
          }
        })

        if (existingUser) {
          return errorResponseBadRequest(
            'Account already exists for user, try logging in'
          )
        }
        const IP =
          req.headers['x-forwarded-for'] || req.connection.remoteAddress

        try {
          const isDeliverable = await isEmailDeliverable(email, req.logger)
          const now = new Date()
          await models.User.create({
            email,
            // Store non checksummed wallet address
            walletAddress: body.walletAddress.toLowerCase(),
            lastSeenDate: now,
            lastActiveAt: now,
            IP,
            isEmailDeliverable: isDeliverable,
            isGuest: body.isGuest
          })

          return successResponse()
        } catch (err) {
          req.logger.error('Error signing up a user', err)
          return errorResponseBadRequest('Error signing up a user')
        }
      } else
        return errorResponseBadRequest(
          'Missing one of the required fields: email, walletAddress'
        )
    })
  )

  /**
   * Check if a email address is taken. email is passed in via query param
   */
  app.get(
    '/users/check',
    handleResponse(async (req, res, next) => {
      let email = req.query.email
      if (email) {
        email = email.toLowerCase()
        const existingUser = await models.User.findOne({
          where: {
            email
          }
        })
        if (existingUser) {
          return successResponse({
            exists: true,
            isGuest: existingUser.isGuest
          })
        } else {
          return successResponse({ exists: false })
        }
      } else
        return errorResponseBadRequest('Please pass in a valid email address')
    })
  )

  /**
   * Update User Timezone / IP
   */
  app.post(
    '/users/update',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      const IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      const { timezone } = req.body
      const { blockchainUserId } = req.user
      if (timezone) {
        try {
          // Associate the blockchain id with this user
          await models.User.update(
            { IP, timezone },
            { where: { blockchainUserId } }
          )
          // Create a user notification setting so the user can receive notifications
          models.UserNotificationSettings.findOrCreate({
            where: { userId: blockchainUserId },
            defaults: { userId: blockchainUserId }
          })

          return successResponse()
        } catch (err) {
          req.logger.error('Error signing up a user', err)
          return errorResponseBadRequest('Error signing up a user')
        }
      }
      return errorResponseBadRequest('Invalid route parameters')
    })
  )

  /**
   * Retrieve authenticated user's email address.
   *
   * Doubles as the post-auth startup ping fired on every app open
   * (after Hedgehog's GET /authentication restores credentials), so we
   * use it as the write site for `lastActiveAt`. The update is
   * fire-and-forget — never block the response on it.
   */
  app.get(
    '/user/email',
    authMiddleware,
    handleResponse(async (req, _res, _next) => {
      const { id: userRowId, blockchainUserId } = req.user
      const userData = await models.User.findOne({
        where: {
          blockchainUserId
        }
      })

      models.User.update(
        { lastActiveAt: new Date() },
        { where: { id: userRowId } }
      ).catch((err) => {
        req.logger.error({ err }, 'Failed to update lastActiveAt')
      })

      return successResponse({
        email: userData.email
      })
    })
  )

  /** DEPRECATED */

  app.post(
    '/user/associate',
    handleResponse(async (req, res, next) => {
      return successResponse()
    })
  )

  app.get(
    '/auth_migration',
    handleResponse(async (req, res, next) => {
      return successResponse()
    })
  )

  app.post(
    '/auth_migration',
    handleResponse(async (req, res, next) => {
      return successResponse()
    })
  )
}
