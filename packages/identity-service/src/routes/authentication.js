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
const authMiddleware = require('../authMiddleware')

const EncodedDataMessageHeader = 'encoded-data-message'
const EncodedDataSignatureHeader = 'encoded-data-signature'

module.exports = function (app) {
  app.post(
    '/authentication',
    handleResponse(async (req, res, next) => {
      const redis = req.app.get('redis')
      const sendgrid = req.app.get('sendgrid')
      if (!sendgrid) {
        req.logger.error('Missing sendgrid api key')
      }

      const body = req.body
      const headers = req.headers

      if (body && body.iv && body.cipherText && body.lookupKey) {
        try {
          const transaction = await models.sequelize.transaction()

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

            const newArtifacts = await models.Authentication.findOne({
              where: { lookupKey: body.lookupKey }
            })

            if (newArtifacts) {
              req.logger.error(
                `Credentials already exist for lookupKey: ${body.lookupKey}`
              )
              return errorResponseBadRequest('Invalid credentials')
            }

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

            if (walletAddress !== null) {
              const userRecord = await models.User.findOne({
                where: { walletAddress },
                transaction
              })

              await userRecord.update({ email }, { transaction })
            }
          }

          let existingRecord = await models.Authentication.findOne({
            where: { lookupKey: body.lookupKey },
            paranoid: false
          })
          if (!existingRecord) {
            await models.Authentication.create(
              {
                iv: body.iv,
                cipherText: body.cipherText,
                lookupKey: body.lookupKey,
                walletAddress
              },
              { transaction }
            )
          } else if (existingRecord.isSoftDeleted()) {
            await existingRecord.restore({ transaction })
          } else {
            existingRecord = await existingRecord.update({
              iv: body.iv,
              cipherText: body.cipherText,
              updatedAt: Date.now()
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
      const { lookupKey, email: emailParam, username, otp } = req.query
      let email = emailParam ?? username
      if (!lookupKey) {
        return errorResponseBadRequest('Missing lookupKey')
      }

      if (!email) {
        return errorResponseBadRequest('Missing email')
      }
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

      const otpRequired = await requiresOtp({ email })
      if (!otpRequired) {
        const associatedEmail = await getWalletAssociatedEmail({
          req,
          authUser: existingUser
        })
        if (!associatedEmail || email !== associatedEmail.toLowerCase()) {
          return errorResponseBadRequest('Invalid credentials')
        }
        return successResponse(existingUser)
      } else if (!otp) {
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
        const isOtpValid = await validateOtp({ email, otp, redis })
        if (!isOtpValid) {
          return errorResponseBadRequest('Invalid credentials')
        }

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
