const axios = require('axios')
const cors = require('cors')
const models = require('../models')
const config = require('../config.js')
const txRelay = require('../relay/txRelay')
const querystring = require('querystring')
const { waitForUser } = require('../utils/waitForUser')

const {
  handleResponse,
  successResponse,
  errorResponseBadRequest
} = require('../apiHelpers')

module.exports = function (app) {
  app.get(
    '/tiktok',
    handleResponse(async (req, res, next) => {
      const csrfState = Math.random().toString(36).substring(7)
      res.cookie('csrfState', csrfState, { maxAge: 600000 })

      let url = 'https://www.tiktok.com/v2/auth/authorize/'

      url += `?client_key=${config.get('tikTokAPIKey')}`
      url += '&scope=user.info.basic,user.info.profile'
      url += '&response_type=code'
      url += `&redirect_uri=${config.get('tikTokAuthOrigin')}`
      url += '&state=' + csrfState

      res.redirect(url)
    })
  )

  const accessTokenCorsOptions = {
    credentials: true,
    origin: true
  }

  app.options('/tiktok/access_token', cors(accessTokenCorsOptions))
  app.post(
    '/tiktok/access_token',
    cors(accessTokenCorsOptions),
    handleResponse(async (req, res, next) => {
      const { code, state } = req.body
      const { csrfState } = req.cookies

      if (!state || !csrfState || state !== csrfState) {
        return errorResponseBadRequest('Invalid state')
      }

      try {
        const accessTokenResponse = await axios.post(
          'https://open.tiktokapis.com/v2/oauth/token/',
          querystring.stringify({
            client_key: config.get('tikTokAPIKey'),
            client_secret: config.get('tikTokAPISecret'),
            code,
            grant_type: 'authorization_code',
            redirect_uri: config.get('tikTokAuthOrigin')
          }),
          {
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            }
          }
        )

        const {
          access_token: accessToken,
          error: errorCode,
          error_description: errorMessage
        } = accessTokenResponse.data

        if (errorCode) {
          return errorResponseBadRequest(
            `Received error from tiktok oauth: ${errorCode} ${errorMessage}`
          )
        }

        const fields = [
          'open_id',
          'username',
          'display_name',
          'profile_deep_link',
          'is_verified'
        ]

        const userResponse = await axios.get(
          `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(
            ','
          )}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        )

        const { data, error } = userResponse.data

        if (error.message) {
          return errorResponseBadRequest(error.message)
        }

        const { user: tikTokUser } = data

        const existingTikTokUser = await models.TikTokUser.findOne({
          where: {
            uuid: tikTokUser.open_id,
            blockchainUserId: {
              [models.Sequelize.Op.not]: null
            }
          }
        })

        if (existingTikTokUser) {
          return errorResponseBadRequest(
            `Another Audius profile has already been authenticated with TikTok user @${tikTokUser.username}!`
          )
        } else {
          await models.TikTokUser.upsert({
            uuid: tikTokUser.open_id,
            profile: tikTokUser,
            verified: tikTokUser.is_verified
          })
        }

        return successResponse({ data: accessTokenResponse.data })
      } catch (err) {
        req.logger.error(`TikTok access_token error`, err)
        return errorResponseBadRequest(err)
      }
    })
  )

  app.post(
    '/tiktok/associate',
    handleResponse(async (req, res, next) => {
      const { uuid, userId, handle, blockNumber } = req.body
      req.connection.setTimeout(60 * 1000)
      const audiusLibsInstance = req.app.get('audiusLibs')

      try {
        const tikTokObj = await models.TikTokUser.findOne({
          where: { uuid }
        })
        const user = await waitForUser({
          userId,
          handle,
          blockNumber,
          audiusLibsInstance,
          logger: req.logger
        })

        const isUnassociated = tikTokObj && !tikTokObj.blockchainUserId
        const handlesMatch =
          tikTokObj &&
          tikTokObj.profile.username.toLowerCase() === user.handle.toLowerCase()

        if (isUnassociated && handlesMatch) {
          tikTokObj.blockchainUserId = userId

          const [encodedABI, contractAddress] =
            await audiusLibsInstance.User.updateSocialVerification(
              userId,
              config.get('userVerifierPrivateKey'),
              {
                is_verified: tikTokObj.verified,
                tiktok_handle: tikTokObj.profile.username
              }
            )
          const senderAddress = config.get('userVerifierPublicKey')
          try {
            const txProps = {
              contractRegistryKey: 'EntityManager',
              contractAddress,
              encodedABI,
              senderAddress,
              gasLimit: null
            }
            await txRelay.sendTransaction(req, false, txProps, 'tikTokVerified')
          } catch (e) {
            return errorResponseBadRequest(e)
          }

          const socialHandle = await models.SocialHandles.findOne({
            where: { handle }
          })
          if (socialHandle) {
            socialHandle.tikTokHandle = tikTokObj.profile.username
            await socialHandle.save()
          } else if (tikTokObj.profile && tikTokObj.profile.username) {
            await models.SocialHandles.create({
              handle,
              tikTokHandle: tikTokObj.profile.username
            })
          }

          try {
            await tikTokObj.save()
            return successResponse()
          } catch (e) {
            return errorResponseBadRequest(e)
          }
        } else {
          req.logger.error(
            `TikTok profile does not exist or userId has already been set for uuid: ${uuid}`,
            tikTokObj
          )
          return errorResponseBadRequest(
            'TikTok profile does not exist or userId has already been set'
          )
        }
      } catch (err) {
        return errorResponseBadRequest(err)
      }
    })
  )
}
