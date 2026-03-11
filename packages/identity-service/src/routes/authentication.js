const sigUtil = require('eth-sig-util')
const models = require('../models')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseForbidden,
  errorResponseUnauthorized
} = require('../apiHelpers')
const {
  validateOtp,
  shouldSendOtp,
  sendOtp,
  requiresOtp
} = require('../utils/otp')
const {
  getWalletAssociatedEmail,
  associateWalletAddressWithUser
} = require('../utils/walletAssociation')
const { validateFingerprint } = require('../utils/fpHelpers')
const authMiddleware = require('../authMiddleware')

const EncodedDataMessageHeader = 'encoded-data-message'
const EncodedDataSignatureHeader = 'encoded-data-signature'

module.exports = function (app) {
  /**
   * This signup function writes the encryption values from the user's browser(iv, cipherText, lookupKey)
   * into the Authentications table and the email to the Users table. This is the first step in the
   * authentication process
   */
  app.post(
    '/authentication',
    handleResponse(async (req, res, next) => {
      const redis = req.app.get('redis')
      const sendgrid = req.app.get('sendgrid')
      if (!sendgrid) {
        req.logger.error('Missing sendgrid api key')
      }

      // body should contain {iv, cipherText, lookupKey}
      const body = req.body
      const headers = req.headers

      if (body && body.iv && body.cipherText && body.lookupKey) {
        try {
          const hasSkipOtp = body.skipOtp !== undefined
          if (hasSkipOtp && typeof body.skipOtp !== 'boolean') {
            return errorResponseBadRequest('Invalid skipOtp')
          }

          const transaction = await models.sequelize.transaction()

          // default to null
          let walletAddress = null
          if (
            headers &&
            headers[EncodedDataMessageHeader] &&
            headers[EncodedDataSignatureHeader]
          ) {
            const encodedDataMessage = headers[EncodedDataMessageHeader]
            const encodedDataSignature = headers[EncodedDataSignatureHeader]
            try {
              walletAddress = sigUtil.recoverPersonalSignature({
                data: encodedDataMessage,
                sig: encodedDataSignature
              })
            } catch (err) {
              // keep address as null for future user recovery
              req.logger.error(err, 'Error recovering users signed address')
            }
          }

          const { email, oldLookupKey } = body
          if (email) {
            if (!oldLookupKey) {
              req.logger.error(
                'Missing one of the required fields: oldLookupKey'
              )
              return errorResponseBadRequest(
                'Missing one of the required fields: oldLookupKey'
              )
            }

            // require signed headers for changing email
            if (walletAddress === null) {
              req.logger.error('Missing wallet')
              return errorResponseBadRequest('Invalid credentials')
            }

            if (body.lookupKey === oldLookupKey) {
              req.logger.error(
                `lookupKey is the same as oldLookupKey: ${body.lookupKey}`
              )
              return errorResponseBadRequest('Invalid credentials')
            }

            // check if new artifacts already exist and are active
            const newArtifacts = await models.Authentication.findOne({
              where: { lookupKey: body.lookupKey }
            })

            if (newArtifacts) {
              // artifacts passed already exist
              req.logger.error(
                `Credentials already exist for lookupKey: ${body.lookupKey}`
              )
              return errorResponseBadRequest('Invalid credentials')
            }

            // if user has wallet connected to auth artifacts, compare old lookupkey with wallet address
            const oldArtifacts = await models.Authentication.findOne({
              where: { lookupKey: oldLookupKey }
            })
            if (!oldArtifacts) {
              req.logger.error('Invalid credentials')
              return errorResponseBadRequest('Invalid credentials')
            }

            if (
              oldArtifacts.walletAddress !== undefined &&
              oldArtifacts.walletAddress !== null
            ) {
              // if signature doesn't match old artifacts
              if (walletAddress !== oldArtifacts.walletAddress) {
                req.logger.error('Signature mismatch for credentials')
                return errorResponseBadRequest('Invalid credentials')
              }
            }

            const otp = body.otp

            if (!otp) {
              await sendOtp({ email, redis, sendgrid })
              return errorResponseForbidden('Missing otp')
            }

            const isOtpValid = await validateOtp({ email, otp, redis })
            if (!isOtpValid) {
              req.logger.error('Invalid OTP')
              return errorResponseBadRequest('Invalid credentials')
            }

            // change email of user whose signature was passed in the call
            // require wallet address from signature when updating email
            if (walletAddress !== null) {
              const userRecord = await models.User.findOne({
                where: { walletAddress },
                transaction
              })

              await userRecord.update({ email }, { transaction })
            }
          }

          // Check if an existing record exists but is soft deleted (since the Authentication model is 'paranoid')
          // Setting the option paranoid to false searches both soft-deleted and non-deleted objects
          // https://sequelize.org/master/manual/paranoid.html
          // https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findAll
          let existingRecord = await models.Authentication.findOne({
            where: { lookupKey: body.lookupKey },
            paranoid: false
          })
          if (!existingRecord) {
            const createAttrs = {
              iv: body.iv,
              cipherText: body.cipherText,
              lookupKey: body.lookupKey,
              walletAddress
            }
            if (hasSkipOtp) {
              createAttrs.skipOtp = body.skipOtp
            }
            await models.Authentication.create(createAttrs, { transaction })
          } else if (existingRecord.isSoftDeleted()) {
            await existingRecord.restore({ transaction })
          } else {
            // old auth artifacts may not be recoverable
            // restart sign up flow and overwrite existing auth artifacts
            const updateAttrs = {
              iv: body.iv,
              cipherText: body.cipherText,
              updatedAt: Date.now()
            }
            existingRecord = await existingRecord.update(updateAttrs, {
              transaction
            })
          }

          if (oldLookupKey && oldLookupKey !== body.lookupKey) {
            await models.Authentication.destroy(
              { where: { lookupKey: oldLookupKey } },
              { transaction }
            )
          }
          await transaction.commit()
          return successResponse()
        } catch (err) {
          req.logger.error(err, 'Error signing up a user')
          return errorResponseBadRequest('Error signing up a user')
        }
      } else
        req.logger.error(
          'Missing one of the required fields: iv, cipherText, lookupKey'
        )
      return errorResponseBadRequest(
        'Missing one of the required fields: iv, cipherText, lookupKey'
      )
    })
  )

  /**
   * Checks to see if a given lookup key exists in the authentications table.
   * Does not log a user in. Does not return credential information. Does not
   * send OTP emails. Requires a signed in user.
   */
  app.get(
    '/authentication/check',
    authMiddleware,
    handleResponse(async (req, _res, _next) => {
      const { lookupKey } = req.query
      if (!lookupKey) {
        return errorResponseBadRequest('Missing lookupKey')
      }

      const existingUser = await models.Authentication.findOne({
        where: { lookupKey }
      })
      if (!existingUser) {
        return errorResponseUnauthorized('Invalid credentials')
      }
      return successResponse()
    })
  )

  app.get(
    '/authentication',
    handleResponse(async (req, res, next) => {
      const {
        lookupKey,
        email: emailParam,
        username,
        visitorId,
        otp
      } = req.query
      let email = emailParam ?? username
      if (!lookupKey) {
        return errorResponseBadRequest('Missing lookupKey')
      }

      if (!email) {
        return errorResponseBadRequest('Missing email')
      }
      // Avoid issues looking up values if user enters email in different casing
      email = email.toLowerCase()

      const existingUser = await models.Authentication.findOne({
        where: { lookupKey }
      })
      if (!existingUser) {
        return errorResponseBadRequest('Invalid credentials')
      }

      const redis = req.app.get('redis')
      const sendgrid = req.app.get('sendgrid')
      if (!sendgrid) {
        req.logger.error('Missing sendgrid api key')
      }

      const otpRequired =
        existingUser.skipOtp === true
          ? false
          : await requiresOtp({ email, visitorId })
      if (!otpRequired) {
        return successResponse(existingUser)
      } else if (!otp) {
        // use email from registered address if available
        const associatedEmail = await getWalletAssociatedEmail({
          req,
          authUser: existingUser
        })
        if (associatedEmail && email !== associatedEmail.toLowerCase()) {
          req.logger.error(
            {
              reqEmail: email,
              registeredEmail: associatedEmail,
              lookupKey: existingUser.lookupKey
            },
            'error getting user record from existing user: user email and auth param mismatch'
          )
          return errorResponseBadRequest('Invalid credentials')
        } else {
          email = (associatedEmail || email).toLowerCase()
        }

        if (await shouldSendOtp({ req, email, redis })) {
          await sendOtp({ email, redis, sendgrid })
        }
        return errorResponseForbidden('Missing otp')
      } else {
        // otp was included in request
        const isOtpValid = await validateOtp({ email, otp, redis })
        if (!isOtpValid) {
          return errorResponseBadRequest('Invalid credentials')
        }

        // async
        validateFingerprint({ req, email, visitorId })

        if (existingUser.walletAddress === null) {
          await associateWalletAddressWithUser({
            req,
            authUser: existingUser,
            email
          })
        }

        return successResponse(existingUser)
      }
    })
  )
}
