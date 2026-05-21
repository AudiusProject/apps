const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const { recoverPersonalSignature } = require('eth-sig-util')
const models = require('../models')
const handlebars = require('handlebars')
const fs = require('fs')
const path = require('path')
const config = require('../config.js')

const WEBSITE_HOST = config.get('websiteHost')

const recoveryTemplate = handlebars.compile(
  fs.readFileSync(path.resolve(__dirname, '../emails/recovery.html')).toString()
)

const toQueryStr = (obj) => {
  return (
    '?' +
    Object.keys(obj)
      .map((key) => {
        return key + '=' + encodeURIComponent(obj[key])
      })
      .join('&')
  )
}

module.exports = function (app) {
  /**
   * Send recovery information to the requested account
   */
  app.post(
    '/recovery',
    handleResponse(async (req, res, next) => {
      const sg = req.app.get('sendgrid')
      if (!sg) {
        req.logger.error('Missing sendgrid api key')
        // Short-circuit if no api key provided, but do not error
        return successResponse({
          msg: 'No sendgrid API Key found',
          status: true
        })
      }

      const { login, data, signature } = req.body

      if (!login) {
        return errorResponseBadRequest('Please provide valid login information')
      }
      if (!data || !signature) {
        return errorResponseBadRequest('Please provide data and signature')
      }

      const walletFromSignature = recoverPersonalSignature({
        data,
        sig: signature
      })
      const existingUser = await models.User.findOne({
        where: {
          walletAddress: walletFromSignature
        }
      })

      if (!existingUser) {
        return errorResponseBadRequest(
          'Invalid signature provided, no user found'
        )
      }
      // Suppress recovery email if the address has not been verified.
      // Fall back to the legacy isEmailDeliverable flag for accounts created
      // before email verification was introduced (those start verified=false
      // but may have a valid deliverable flag).
      const canReceiveEmail =
        existingUser.isEmailVerified || existingUser.isEmailDeliverable
      if (!canReceiveEmail) {
        req.logger.info(
          `Unable to deliver recovery email to ${existingUser.email}`
        )
        return successResponse({
          msg: 'Recovery email forbidden',
          status: true
        })
      }

      const email = existingUser.email
      const recoveryParams = {
        warning: 'RECOVERY_DO_NOT_SHARE',
        login,
        email
      }
      const recoveryLink = WEBSITE_HOST + toQueryStr(recoveryParams)
      const copyrightYear = new Date().getFullYear().toString()
      const context = {
        recovery_link: recoveryLink,
        copyright_year: copyrightYear
      }
      const recoveryHtml = recoveryTemplate(context)

      const emailParams = {
        from: 'Audius Recovery <recovery@audius.co>',
        to: `${email}`,
        subject: 'Save This Email: Audius Password Recovery',
        html: recoveryHtml
      }
      try {
        await sg.send(emailParams)
        await models.UserEvents.upsert(
          {
            walletAddress: walletFromSignature,
            needsRecoveryEmail: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            where: { walletAddress: walletFromSignature }
          }
        )
        return successResponse({ status: true })
      } catch (e) {
        return errorResponseServerError(e)
      }
    })
  )
}
