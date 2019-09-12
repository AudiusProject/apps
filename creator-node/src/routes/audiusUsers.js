const { Buffer } = require('ipfs-http-client')
const fs = require('fs')

const models = require('../models')
const { saveFileFromBuffer } = require('../fileManager')
const { handleResponse, successResponse, errorResponseBadRequest, errorResponseServerError } = require('../apiHelpers')
const { getFileUUIDForImageCID } = require('../utils')
const { authMiddleware, syncLockMiddleware, ensurePrimaryMiddleware, triggerSecondarySyncs } = require('../middlewares')

module.exports = function (app) {
  /** Create AudiusUser from provided metadata, and make metadata available to network. */
  app.post('/audius_users/metadata', authMiddleware, syncLockMiddleware, handleResponse(async (req, res) => {
    // TODO - input validation
    const metadataJSON = req.body.metadata

    const metadataBuffer = Buffer.from(JSON.stringify(metadataJSON))
    const { multihash, fileUUID } = await saveFileFromBuffer(req, metadataBuffer, 'metadata')

    return successResponse({ 'metadataMultihash': multihash, 'metadataFileUUID': fileUUID })
  }))

  /**
   * Given audiusUser blockchainUserId, blockNumber, and metadataFileUUID, creates/updates AudiusUser DB entry
   * and associates image file entries with audiusUser. Ends audiusUser creation/update process.
   */
  app.post('/audius_users', authMiddleware, ensurePrimaryMiddleware, syncLockMiddleware, handleResponse(async (req, res) => {
    const { blockchainUserId, blockNumber, metadataFileUUID } = req.body

    if (!blockchainUserId || !blockNumber || !metadataFileUUID) {
      return errorResponseBadRequest('Must include blockchainUserId, blockNumber, and metadataFileUUID.')
    }

    // Error on outdated blocknumber.
    const cnodeUser = req.session.cnodeUser
    if (!cnodeUser.latestBlockNumber || cnodeUser.latestBlockNumber >= blockNumber) {
      return errorResponseBadRequest(`Invalid blockNumber param. Must be higher than previously processed blocknumber.`)
    }
    const cnodeUserUUID = req.session.cnodeUserUUID

    // Fetch metadataJSON for metadataFileUUID.
    const file = await models.File.findOne({ where: { fileUUID: metadataFileUUID, cnodeUserUUID } })
    if (!file) {
      return errorResponseBadRequest(`No file found for provided metadataFileUUID ${metadataFileUUID}.`)
    }
    let metadataJSON
    try {
      metadataJSON = JSON.parse(fs.readFileSync(file.storagePath))
    } catch (e) {
      return errorResponseServerError(`No file stored on disk for metadataFileUUID ${metadataFileUUID} at storagePath ${file.storagePath}.`)
    }

    // Get coverArtFileUUID and profilePicFileUUID for multihashes in metadata object, if present.
    let coverArtFileUUID, profilePicFileUUID
    try {
      coverArtFileUUID = await getFileUUIDForImageCID(req, metadataJSON.cover_photo_sizes)
      profilePicFileUUID = await getFileUUIDForImageCID(req, metadataJSON.profile_picture_sizes)
    } catch (e) {
      return errorResponseBadRequest(e.message)
    }

    const t = await models.sequelize.transaction()

    // Insert / update audiusUser entry on db.
    const audiusUser = await models.AudiusUser.upsert({
      cnodeUserUUID,
      metadataFileUUID,
      metadataJSON,
      blockchainId: blockchainUserId,
      coverArtFileUUID,
      profilePicFileUUID
    }, { transaction: t, returning: true })

    // Update cnodeUser's latestBlockNumber.
    await cnodeUser.update({ latestBlockNumber: blockNumber }, { transaction: t })

    try {
      await t.commit()
      triggerSecondarySyncs(req)
      return successResponse({ audiusUserUUID: audiusUser.audiusUserUUID })
    } catch (e) {
      await t.rollback()
      return errorResponseServerError(e.message)
    }
  }))
}
