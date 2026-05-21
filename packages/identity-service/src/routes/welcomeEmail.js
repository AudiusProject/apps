const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const models = require('../models')
const handlebars = require('handlebars')
const fs = require('fs')
const path = require('path')
const authMiddleware = require('../authMiddleware')
const { getWelcomeEmail } = require('../emails/welcome')
const axios = require('axios')
const audiusLibsWrapper = require('../audiusLibsInstance')
const config = require('../config.js')

module.exports = function (app) {
  /**
   * Send the welcome email information to the requested account
   */
  app.post(
    '/email/welcome',
    authMiddleware,
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

      const { name, isNativeMobile = false } = req.body
      if (!name) {
        return errorResponseBadRequest('Please provide a name')
      }

      const existingUser = await models.User.findOne({
        where: { id: req.user.id }
      })

      if (!existingUser) {
        return errorResponseBadRequest(
          'Invalid signature provided, no user found'
        )
      }
      // Suppress welcome email if the address has not been verified. Fall back
      // to the legacy isEmailDeliverable flag for pre-verification accounts.
      const canReceiveEmail =
        existingUser.isEmailVerified || existingUser.isEmailDeliverable
      if (!canReceiveEmail) {
        req.logger.info(
          `Unable to deliver welcome email to ${existingUser.handle} ${existingUser.email}`
        )
        return successResponse({ msg: 'Welcome email forbidden', status: true })
      }
      if (existingUser.isBlockedFromEmails) {
        req.logger.info(
          `User with handle ${existingUser.handle} and email ${existingUser.email} is blocked from receiving emails`
        )
        return successResponse({ msg: 'Welcome email forbidden', status: true })
      }

      const walletAddress = existingUser.walletAddress
      const copyrightYear = new Date().getFullYear().toString()
      const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()
      const featuredContent = (
        await axios.get(
          `${discoveryProvider.discoveryProviderEndpoint}/v1/full/tracks/trending?limit=3&offset=0&time=month`
        )
      )?.data?.data

      const welcomeHtml = getWelcomeEmail({
        name,
        copyrightYear,
        featuredContent
      })

      const emailParams = {
        from: 'The Audius Team <team@audius.co>',
        to: existingUser.email,
        bcc: ['forrest@audius.co'],
        subject: 'Welcome to Audius! 👋',
        html: welcomeHtml,
        asm: {
          groupId: 19141 // id of unsubscribe group at https://mc.sendgrid.com/unsubscribe-groups
        }
      }
      try {
        await sg.send(emailParams)
        await models.sequelize.query(
          `
          INSERT INTO "UserEvents" ("walletAddress", "hasSignedInNativeMobile", "createdAt", "updatedAt")
          VALUES (:walletAddress, :hasSignedInNativeMobile, now(), now())
          ON CONFLICT ("walletAddress")
          DO
            UPDATE SET "hasSignedInNativeMobile" = :hasSignedInNativeMobile;
        `,
          {
            replacements: {
              walletAddress,
              hasSignedInNativeMobile: isNativeMobile
            }
          }
        )
        if (config.get('environment') === 'production') {
          // Add email to SendGrid contacts
          const sgClient = req.app.get('sendgridClient')
          const addContactRequest = {
            method: 'PUT',
            url: '/v3/marketing/contacts',
            body: {
              contacts: [{ email: existingUser.email }]
            }
          }

          await sgClient.request(addContactRequest)
        }

        return successResponse({ status: true })
      } catch (e) {
        req.logger.error(e)
        return errorResponseServerError(e)
      }
    })
  )
}
