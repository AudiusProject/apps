const request = require('request')
const qs = require('querystring')
const config = require('../config.js')
const models = require('../models')
const uuidv4 = require('uuid/v4')
const txRelay = require('../relay/txRelay')
const { waitForUser } = require('../utils/waitForUser')

const {
  handleResponse,
  successResponse,
  errorResponseBadRequest
} = require('../apiHelpers')

module.exports = function (app) {
  app.post(
    '/twitter',
    handleResponse(async (req, res, next) => {
      const reqObj = {
        method: 'post',
        url: 'https://api.twitter.com/oauth/request_token',
        oauth: {
          oauth_callback: req.headers.origin,
          consumer_key: config.get('twitterAPIKey'),
          consumer_secret: config.get('twitterAPISecret')
        }
      }

      try {
        const body = await doRequest(reqObj)
        const responseData = qs.parse(body)
        return successResponse(responseData)
      } catch (err) {
        return errorResponseBadRequest(err)
      }
    })
  )

  app.post(
    '/twitter/callback',
    handleResponse(async (req, res, next) => {
      const reqObj = {
        method: 'post',
        url: `https://api.twitter.com/oauth/access_token?oauth_verifier`,
        oauth: {
          consumer_key: config.get('twitterAPIKey'),
          consumer_secret: config.get('twitterAPISecret'),
          token: req.query.oauth_token
        },
        form: { oauth_verifier: req.query.oauth_verifier }
      }

      try {
        const body = await doRequest(reqObj)
        const responseData = qs.parse(body)

        const userRequest = {
          method: 'get',
          url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
          oauth: {
            consumer_key: config.get('twitterAPIKey'),
            consumer_secret: config.get('twitterAPISecret'),
            token: responseData.oauth_token,
            token_secret: responseData.oauth_token_secret
          },
          json: true
        }
        const userProfile = await doRequest(userRequest)
        const existingTwitterUser = await models.TwitterUser.findOne({
          where: {
            'twitterProfile.id': userProfile.id,
            blockchainUserId: {
              [models.Sequelize.Op.not]: null
            }
          }
        })
        if (existingTwitterUser) {
          req.logger.info(`Twitter user found: ${existingTwitterUser}`)
          return errorResponseBadRequest(
            `Another Audius profile has already been authenticated with this Twitter user!`
          )
        } else {
          try {
            const uuid = uuidv4()
            models.TwitterUser.create({
              twitterProfile: userProfile,
              verified: userProfile.verified,
              uuid
            })
            return successResponse({ profile: userProfile, uuid })
          } catch (err) {
            return errorResponseBadRequest(err)
          }
        }
      } catch (err) {
        return errorResponseBadRequest(err)
      }
    })
  )

  app.get(
    '/twitter/handle_lookup',
    handleResponse(async (req, res, next) => {
      const handle = req.query.handle

      if (!handle) {
        return errorResponseBadRequest(
          'Please enter a valid handle as a query param'
        )
      }

      const userLookupRoute =
        Math.random() > 0.5 ? `username/${handle}?` : `?usernames=${handle}`

      const userRequest = {
        method: 'get',
        url: `https://api.twitter.com/2/users/by/${userLookupRoute}&user.fields=verified`,
        headers: {
          Authorization: `Bearer ${config.get('twitterBearerToken')}`
        },
        json: true
      }

      try {
        const [response, profile] = await makeRequest(userRequest)

        if (response.statusCode === 429) {
          const rateLimitMessage = 'Twitter user lookup rate-limit exceeded'
          console.warn(rateLimitMessage)
          return errorResponseBadRequest(rateLimitMessage)
        }

        if (Array.isArray(profile.data)) {
          profile.data = profile.data[0]
        }

        return successResponse({ profile })
      } catch (err) {
        return errorResponseBadRequest(err)
      }
    })
  )

  app.post(
    '/twitter/associate',
    handleResponse(async (req, res, next) => {
      const { uuid, userId, handle, blockNumber } = req.body
      req.connection.setTimeout(60 * 1000)
      const audiusLibsInstance = req.app.get('audiusLibs')

      try {
        const twitterObj = await models.TwitterUser.findOne({
          where: { uuid }
        })
        const user = await waitForUser({
          userId,
          handle,
          blockNumber,
          audiusLibsInstance,
          logger: req.logger
        })

        const isUnassociated = twitterObj && !twitterObj.blockchainUserId
        const handlesMatch =
          twitterObj &&
          twitterObj.twitterProfile.screen_name.toLowerCase() ===
            user.handle.toLowerCase()
        if (isUnassociated && handlesMatch) {
          twitterObj.blockchainUserId = userId

          const [encodedABI, contractAddress] =
            await audiusLibsInstance.User.updateSocialVerification(
              userId,
              config.get('userVerifierPrivateKey'),
              {
                is_verified: twitterObj.verified,
                twitter_handle: twitterObj.twitterProfile.screen_name
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
            await txRelay.sendTransaction(
              req,
              false,
              txProps,
              'twitterVerified'
            )
          } catch (e) {
            return errorResponseBadRequest(e)
          }

          const socialHandle = await models.SocialHandles.findOne({
            where: { handle }
          })
          if (socialHandle) {
            socialHandle.twitterHandle = twitterObj.twitterProfile.screen_name
            await socialHandle.save()
          } else if (
            twitterObj.twitterProfile &&
            twitterObj.twitterProfile.screen_name
          ) {
            await models.SocialHandles.create({
              handle,
              twitterHandle: twitterObj.twitterProfile.screen_name
            })
          }

          try {
            await twitterObj.save()
            return successResponse()
          } catch (e) {
            return errorResponseBadRequest(e)
          }
        } else {
          req.logger.error(
            `Twitter profile does not exist or userId has already been set for uuid: ${uuid}`,
            twitterObj
          )
          return errorResponseBadRequest(
            'Twitter profile does not exist or userId has already been set'
          )
        }
      } catch (err) {
        return errorResponseBadRequest(err)
      }
    })
  )
}

/**
 * Since request is a callback based API, we need to wrap it in a promise to make it async/await compliant
 * @param {Object} reqObj construct request object compatible with `request` module
 */
function doRequest(reqObj) {
  return new Promise(function (resolve, reject) {
    request(reqObj, function (err, r, body) {
      if (err) reject(err)
      else resolve(body)
    })
  })
}

function makeRequest(reqObj) {
  return new Promise(function (resolve, reject) {
    request(reqObj, function (err, response, body) {
      if (err) reject(err)
      else resolve([response, body])
    })
  })
}
