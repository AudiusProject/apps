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
const { getIP, recordIP } = require('../utils/antiAbuse')

module.exports = function (app) {
  app.get(
    '/id_signals',
    userHandleMiddleware,
    handleResponse(async (req) => {
      if (req.headers['x-score'] !== config.get('scoreSecret')) {
        return errorResponseForbidden('Not permissioned to view scores.')
      }

      const handle = req.query.handle
      if (!handle) return errorResponseBadRequest('Please provide handle')

      const [captchaScores, cognitoFlowScores, userIPRecord, handleSimilarity] =
        await Promise.all([
          models.sequelize.query(
            `select "Users"."blockchainUserId" as "userId", "BotScores"."recaptchaScore" as "score", "BotScores"."recaptchaContext" as "context", "BotScores"."updatedAt" as "updatedAt"
        from
          "Users" inner join "BotScores" on "Users"."walletAddress" = "BotScores"."walletAddress"
        where
          "Users"."handle" = :handle`,
            {
              replacements: { handle },
              type: QueryTypes.SELECT
            }
          ),
          models.sequelize.query(
            `select "Users"."blockchainUserId" as "userId", "CognitoFlows"."score" as "score"
        from
          "Users" inner join "CognitoFlows" on "Users"."handle" = "CognitoFlows"."handle"
        where
          "Users"."handle" = :handle`,
            {
              replacements: { handle },
              type: QueryTypes.SELECT
            }
          ),
          models.UserIPs.findOne({ where: { handle } }),
          models.sequelize.query(
            `select count(*) from "Users" where "handle" SIMILAR TO :handle;`,
            {
              replacements: {
                handle: `[0-9]*${handle.replace(/(^\d*|\d*$)/g, '')}[0-9]*`
              },
              type: QueryTypes.SELECT
            }
          )
        ])

      const response = {
        captchaScores,
        cognitoFlowScores,
        socialSignals: {},
        userIP: userIPRecord && userIPRecord.userIP,
        emailAddress: req.user.email,
        handleSimilarity: handleSimilarity[0]?.count ?? 0
      }

      return successResponse(response)
    })
  )

  app.post(
    '/record_ip',
    authMiddleware,
    handleResponse(async (req) => {
      const { blockchainUserId, handle } = req.user

      try {
        const userIP = getIP(req)
        req.logger.info(
          `idSignals | record_ip | User IP is ${userIP} for user with id ${blockchainUserId} and handle ${handle}`
        )
        await recordIP(userIP, handle)
        return successResponse({ userIP })
      } catch (e) {
        req.logger.error(
          `idSignals | record_ip | Failed to record IP for user ${handle}`
        )
        return errorResponseServerError(
          `Failed to record IP for user ${handle}`
        )
      }
    })
  )
}
