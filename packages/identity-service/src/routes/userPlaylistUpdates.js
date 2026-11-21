const moment = require('moment-timezone')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const models = require('../models')
const authMiddleware = require('../authMiddleware')

module.exports = function (app) {
  /**
   * Returns the playlistUpdates dictionary for given user
   * @param {string} walletAddress   user wallet address
   */
  app.get(
    '/user_playlist_updates',
    handleResponse(async (req) => {
      const { walletAddress } = req.query
      if (!walletAddress) {
        return errorResponseBadRequest('Please provide a wallet address')
      }

      try {
        const userEvents = await models.UserEvents.findOne({
          attributes: ['playlistUpdates'],
          where: { walletAddress }
        })
        if (!userEvents)
          throw new Error(`UserEvents for ${walletAddress} not found`)

        return successResponse({ playlistUpdates: userEvents.playlistUpdates })
      } catch (e) {
        req.logger.error(e)
        return errorResponseServerError(
          `Unable to get user last playlist views for ${walletAddress}`
        )
      }
    })
  )

  /**
   * Updates the lastPlaylistViews field for the user in the UserEvents table
   * @param {boolean} playlistId   id of playlist or folder to update
   */
  app.post(
    '/user_playlist_updates',
    authMiddleware,
    handleResponse(async (req) => {
      const { playlistId } = req.query
      const { walletAddress } = req.user
      if (!walletAddress || !playlistId) {
        return errorResponseBadRequest(
          'Please provide a wallet address and a playlist library item id'
        )
      }

      try {
        const result = await models.UserEvents.findOne({
          attributes: ['playlistUpdates'],
          where: { walletAddress }
        })
        if (!result)
          throw new Error(`Playlist updates for ${walletAddress} not found`)

        const playlistUpdatesResult = result.playlistUpdates
        const now = moment().utc().valueOf()
        let playlistUpdates = {}
        if (!playlistUpdatesResult) {
          playlistUpdates[playlistId] = {
            lastUpdated: now,
            userLastViewed: now
          }
        } else {
          playlistUpdates = {
            ...playlistUpdatesResult,
            [playlistId]: {
              lastUpdated: now,
              ...playlistUpdatesResult[playlistId],
              userLastViewed: now
            }
          }
        }

        await models.UserEvents.update(
          { playlistUpdates },
          { where: { walletAddress } }
        )
        return successResponse({})
      } catch (e) {
        req.logger.error(e)
        console.log(e)
        return errorResponseServerError(
          `Unable to update user last playlist views for ${walletAddress} for playlist library item id ${playlistId}`
        )
      }
    })
  )
}
