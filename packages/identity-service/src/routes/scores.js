const config = require('../config')
const {
  handleResponse,
  successResponse,
  errorResponseForbidden,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const models = require('../models')
const { QueryTypes } = require('sequelize')
const userHandleMiddleware = require('../userHandleMiddleware')
const authMiddleware = require('../authMiddleware')
const { verify } = require('hcaptcha')
const HCAPTCHA_SECRET = config.get('hCaptchaSecret')

module.exports = function (app) {
  app.get(
    '/scores',
    userHandleMiddleware,
    handleResponse(async (req) => {
      if (req.headers['x-score'] !== config.get('scoreSecret')) {
        return errorResponseForbidden('Not permissioned to view scores.')
      }

      const handle = req.query.handle
      if (!handle) return errorResponseBadRequest('Please provide handle')

      const captchaScores = await models.sequelize.query(
        `select "Users"."blockchainUserId" as "userId", "BotScores"."recaptchaScore" as "score", "BotScores"."recaptchaContext" as "context", "BotScores"."updatedAt" as "updatedAt"
      from 
        "Users" inner join "BotScores" on "Users"."walletAddress" = "BotScores"."walletAddress"
      where
        "Users"."handle" = :handle`,
        {
          replacements: { handle },
          type: QueryTypes.SELECT
        }
      )

      const cognitoFlowScores = await models.sequelize.query(
        `select "Users"."blockchainUserId" as "userId", "CognitoFlows"."score" as "score"
      from 
        "Users" inner join "CognitoFlows" on "Users"."handle" = "CognitoFlows"."handle"
      where
        "Users"."handle" = :handle`,
        {
          replacements: { handle },
          type: QueryTypes.SELECT
        }
      )

      return successResponse({ captchaScores, cognitoFlowScores })
    })
  )

  app.post(
    '/score/hcaptcha',
    authMiddleware,
    handleResponse(async (req) => {
      const user = req.user
      const token = req.body.token

      if (!token) {
        return errorResponseBadRequest('Please provide hCaptcha token.')
      }

      try {
        const { success, hostname } = await verify(HCAPTCHA_SECRET, token)

        if (!success) {
          return errorResponseServerError('hCaptcha Verification failed.')
        }

        await models.BotScores.create({
          walletAddress: user.walletAddress,
          recaptchaScore: 1,
          recaptchaContext: 'hCaptcha',
          recaptchaHostname: hostname
        })
        return successResponse({})
      } catch (err) {
        console.error(err)
        return errorResponseServerError(err.message)
      }
    })
  )
}
