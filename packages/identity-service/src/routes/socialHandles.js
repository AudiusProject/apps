const {
  handleResponse,
  successResponse,
  errorResponseBadRequest
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const models = require('../models')

module.exports = function (app) {
  app.get(
    '/social_handles',
    handleResponse(async (req, res, next) => {
      const { handle } = req.query
      if (!handle) return errorResponseBadRequest('Please provide handle')

      const socialHandles = await models.SocialHandles.findOne({
        where: { handle }
      })

      const twitterUser = await models.TwitterUser.findOne({
        where: {
          'twitterProfile.screen_name': handle,
          verified: true
        }
      })

      const instagramUser = await models.InstagramUser.findOne({
        where: {
          'profile.username': handle.toLowerCase(),
          verified: true
        }
      })

      const tikTokUser = await models.TikTokUser.findOne({
        where: {
          'profile.display_name': handle.toLowerCase(),
          verified: true
        }
      })

      if (socialHandles) {
        return successResponse({
          ...socialHandles.dataValues,
          twitterVerified: !!twitterUser,
          instagramVerified: !!instagramUser,
          tikTokVerified: !!tikTokUser
        })
      } else return successResponse()
    })
  )

  app.post(
    '/social_handles',
    authMiddleware,
    handleResponse(async (req, res, next) => {
      let { twitterHandle, instagramHandle, tikTokHandle, website, donation } =
        req.body
      const handle = req.user.handle
      const socialHandles = await models.SocialHandles.findOne({
        where: { handle }
      })

      const twitterUser = await models.TwitterUser.findOne({
        where: {
          'twitterProfile.screen_name': twitterHandle,
          verified: true
        }
      })
      if (twitterUser) {
        twitterHandle = handle
      }

      if (socialHandles) {
        await socialHandles.update({
          handle,
          twitterHandle,
          instagramHandle,
          tikTokHandle,
          website,
          donation
        })
      } else {
        await models.SocialHandles.create({
          handle,
          twitterHandle,
          instagramHandle,
          tikTokHandle,
          website,
          donation
        })
      }
      return successResponse()
    })
  )
}
