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
const { isDisposableEmail } = require('../utils/disposableEmail')
const {
  generateVerificationToken,
  hashToken,
  sendVerificationEmail
} = require('../utils/emailVerification')

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

        if (isDisposableEmail(email)) {
          return errorResponseBadRequest(
            'Please use a non-disposable email address'
          )
        }

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
          const verificationToken = generateVerificationToken()
          const hashedToken = hashToken(verificationToken)
          const isGuest = !!body.isGuest

          await models.User.create({
            email,
            // Store non checksummed wallet address
            walletAddress: body.walletAddress.toLowerCase(),
            lastSeenDate: Date.now(),
            IP,
            isEmailDeliverable: isDeliverable,
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationTokenCreatedAt: new Date(),
            isGuest
          })

          if (!isGuest) {
            try {
              await sendVerificationEmail({
                email,
                token: verificationToken,
                sendgrid: req.app.get('sendgrid'),
                logger: req.logger
              })
            } catch (emailErr) {
              req.logger.error(
                `Error sending verification email to ${email}`,
                emailErr
              )
            }
          }

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
          // Create a user notification setting so the user can receive notifications.
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
   * Retrieve authenticated user's email address
   */
  app.get(
    '/user/email',
    authMiddleware,
    handleResponse(async (req, _res, _next) => {
      const { blockchainUserId } = req.user
      const userData = await models.User.findOne({
        where: {
          blockchainUserId
        }
      })

      return successResponse({
        email: userData.email,
        isEmailVerified: userData.isEmailVerified
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
