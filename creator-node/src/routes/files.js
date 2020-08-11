const Redis = require('ioredis')
const fs = require('fs')
var contentDisposition = require('content-disposition')

const { uploadTempDiskStorage } = require('../fileManager')
const {
  handleResponse,
  sendResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError,
  errorResponseNotFound,
  errorResponseForbidden,
  errorResponseRangeNotSatisfiable
} = require('../apiHelpers')

const models = require('../models')
const config = require('../config.js')
const redisClient = new Redis(config.get('redisPort'), config.get('redisHost'))
const { authMiddleware, syncLockMiddleware, triggerSecondarySyncs } = require('../middlewares')
const { getIPFSPeerId, ipfsSingleByteCat, ipfsStat } = require('../utils')
const ImageProcessingQueue = require('../ImageProcessingQueue')
const RehydrateIpfsQueue = require('../RehydrateIpfsQueue')

/**
 * Helper method to stream file from file system on creator node
 * Serves partial content using range requests
 */
const streamFromFileSystem = async (req, res, path) => {
  try {
    // If file cannot be found on disk, throw error
    if (!fs.existsSync(path)) {
      throw new Error('File could not be found on disk.')
    }

    // Stream file from file system
    let fileStream

    let stat
    if (req.params.streamable) {
      // Add content length headers
      // Stats a file from FS and returns fs stat info, like size in bytes
      stat = fs.statSync(path)
      res.set('Accept-Ranges', 'bytes')
      res.set('Content-Length', stat.size)
    }

    // If a range header is present, use that to create the readstream
    // otherwise, stream the whole file.

    // https://expressjs.com/en/5x/api.html#req.range
    // Returns array of range objects - [{start, end}]
    const range = req.range()

    // TODO - route doesn't support multipart ranges (see spec above),
    if (stat && range && range[0]) {
      const { start, end } = range[0]
      if (end >= stat.size) {
        // Set "Requested Range Not Satisfiable" header and exit
        res.status(416)
        return sendResponse(req, res, errorResponseRangeNotSatisfiable('Range not satisfiable'))
      }

      fileStream = fs.createReadStream(path, { start, end })

      // set 206 "Partial Content" success status response code
      res.status(206)
    } else {
      fileStream = fs.createReadStream(path)
    }

    await new Promise((resolve, reject) => {
      fileStream
        .on('open', () => fileStream.pipe(res))
        .on('end', () => { res.end(); resolve() })
        .on('error', e => { reject(e) })
    })
  } catch (e) {
    // Unable to stream from file system. Throw a server error message
    throw e
  }
}

// Gets a CID, streaming from the filesystem if available and falling back to IPFS if not
const getCID = async (req, res) => {
  if (!(req.params && req.params.CID)) {
    return sendResponse(req, res, errorResponseBadRequest(`Invalid request, no CID provided`))
  }

  // Do not act as a public gateway. Only serve IPFS files that are hosted by this creator node.
  const CID = req.params.CID

  // Don't serve if blacklisted.
  if (await req.app.get('blacklistManager').CIDIsInBlacklist(CID)) {
    return sendResponse(req, res, errorResponseForbidden(`CID ${CID} has been blacklisted by this node.`))
  }

  // Don't serve if not found in DB.
  const queryResults = await models.File.findOne({ where: {
    multihash: CID
  } })
  if (!queryResults) {
    return sendResponse(req, res, errorResponseNotFound(`No valid file found for provided CID: ${CID}`))
  }

  if (queryResults.type === 'dir') return sendResponse(req, res, errorResponseBadRequest('this dag node is a directory'))

  redisClient.incr('ipfsStandaloneReqs')
  const totalStandaloneIpfsReqs = parseInt(await redisClient.get('ipfsStandaloneReqs'))
  req.logger.info(`IPFS Standalone Request - ${CID}`)
  req.logger.info(`IPFS Stats - Standalone Requests: ${totalStandaloneIpfsReqs}`)

  // If client has provided filename, set filename in header to be auto-populated in download prompt.
  if (req.query.filename) {
    res.setHeader('Content-Disposition', contentDisposition(req.query.filename))
  }

  try {
    // Add a rehydration task to the queue to be processed in the background
    RehydrateIpfsQueue.addRehydrateIpfsFromFsIfNecessaryTask(CID, queryResults.storagePath, { logContext: req.logContext })
    // Attempt to stream file to client.
    req.logger.info(`Retrieving ${queryResults.storagePath} directly from filesystem`)
    return await streamFromFileSystem(req, res, queryResults.storagePath)
  } catch (e) {
    req.logger.info(`Failed to retrieve ${queryResults.storagePath} from FS`)
  }

  try {
    // Add content length headers
    // If the IPFS stat call fails or timesout, an error is thrown
    const stat = await ipfsStat(CID, req.logContext, 500)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Length', stat.size)

    // Stream file from ipfs if cat one byte takes under 500ms
    // If catReadableStream() promise is rejected, throw an error and stream from file system
    await new Promise((resolve, reject) => {
      let stream
      // If a range header is present, use that to create the ipfs stream
      const range = req.range()
      if (req.params.streamable && range && range[0]) {
        const { start, end } = range[0]
        if (end >= stat.size) {
          // Set "Requested Range Not Satisfiable" header and exit
          res.status(416)
          return sendResponse(req, res, errorResponseRangeNotSatisfiable('Range not satisfiable'))
        }

        // Set length to be end - start + 1 so it matches behavior of fs.createReadStream
        stream = req.app.get('ipfsAPI').catReadableStream(
          CID, { offset: start, length: end - start + 1 }
        )
        res.status(206)
      } else {
        stream = req.app.get('ipfsAPI').catReadableStream(CID)
      }

      stream
        .on('data', streamData => { res.write(streamData) })
        .on('end', () => { res.end(); resolve() })
        .on('error', e => { reject(e) })
    })
  } catch (e) {
    // If the file cannot be retrieved through IPFS, return 500 without attempting to stream file.
    return sendResponse(req, res, errorResponseServerError(e.message))
  }
}

// Gets a CID in a directory, streaming from the filesystem if available and
// falling back to IPFS if not
const getDirCID = async (req, res) => {
  if (!(req.params && req.params.dirCID && req.params.filename)) {
    return sendResponse(req, res, errorResponseBadRequest(`Invalid request, no multihash provided`))
  }

  // Do not act as a public gateway. Only serve IPFS files that are tracked by this creator node.
  const dirCID = req.params.dirCID
  const filename = req.params.filename
  const ipfsPath = `${dirCID}/${filename}`

  // Don't serve if not found in DB.
  // Query for the file based on the dirCID and filename
  const queryResults = await models.File.findOne({ where: {
    dirMultihash: dirCID,
    fileName: filename
  } })
  if (!queryResults) {
    return sendResponse(
      req,
      res,
      errorResponseNotFound(`No valid file found for provided dirCID: ${dirCID} and filename: ${filename}`)
    )
  }
  // Lop off the last bit of the storage path (the child CID)
  // to get the parent storage path for IPFS rehydration
  const parentStoragePath = queryResults.storagePath.split('/').slice(0, -1).join('/')

  redisClient.incr('ipfsStandaloneReqs')
  const totalStandaloneIpfsReqs = parseInt(await redisClient.get('ipfsStandaloneReqs'))
  req.logger.info(`IPFS Standalone Request - ${ipfsPath}`)
  req.logger.info(`IPFS Stats - Standalone Requests: ${totalStandaloneIpfsReqs}`)

  try {
    // Add rehydrate task to queue to be processed in background
    RehydrateIpfsQueue.addRehydrateIpfsFromFsIfNecessaryTask(dirCID, parentStoragePath, { logContext: req.logContext }, filename)
    // Attempt to stream file to client.
    req.logger.info(`Retrieving ${queryResults.storagePath} directly from filesystem`)
    return await streamFromFileSystem(req, res, queryResults.storagePath)
  } catch (e) {
    req.logger.info(`Failed to retrieve ${queryResults.storagePath} from FS`)
  }

  try {
    // For files not found on disk, attempt to stream from IPFS
    // Cat 1 byte of CID in ipfs to determine if file exists
    // If the request takes under 500ms, stream the file from ipfs
    // else if the request takes over 500ms, throw an error
    await ipfsSingleByteCat(ipfsPath, req.logContext, 500)

    await new Promise((resolve, reject) => {
      req.app.get('ipfsAPI').catReadableStream(ipfsPath)
        .on('data', streamData => { res.write(streamData) })
        .on('end', () => { res.end(); resolve() })
        .on('error', e => { reject(e) })
    })
  } catch (e) {
    return sendResponse(req, res, errorResponseServerError(e.message))
  }
}

module.exports = function (app) {
  /** Store image in multiple-resolutions on disk + DB and make available via IPFS */
  app.post('/image_upload', authMiddleware, syncLockMiddleware, uploadTempDiskStorage.single('file'), handleResponse(async (req, res) => {
    if (!req.body.square || !(req.body.square === 'true' || req.body.square === 'false')) {
      return errorResponseBadRequest('Must provide square boolean param in request body')
    }
    if (!req.file) {
      return errorResponseBadRequest('Must provide image file in request body.')
    }
    let routestart = Date.now()

    const imageBufferOriginal = req.file.path
    const originalFileName = req.file.originalname
    let resizeResp

    // Resize the images and add them to IPFS and filestorage
    try {
      if (req.body.square === 'true') {
        resizeResp = await ImageProcessingQueue.resizeImage({
          file: imageBufferOriginal,
          fileName: originalFileName,
          storagePath: req.app.get('storagePath'),
          sizes: {
            '150x150.jpg': 150,
            '480x480.jpg': 480,
            '1000x1000.jpg': 1000
          },
          square: true,
          logContext: req.logContext
        })
      } else /** req.body.square == 'false' */ {
        resizeResp = await ImageProcessingQueue.resizeImage({
          file: imageBufferOriginal,
          fileName: originalFileName,
          storagePath: req.app.get('storagePath'),
          sizes: {
            '640x.jpg': 640,
            '2000x.jpg': 2000
          },
          square: false,
          logContext: req.logContext
        })
      }

      req.logger.info('ipfs add resp', resizeResp)
    } catch (e) {
      return errorResponseServerError(e)
    }

    const t = await models.sequelize.transaction()
    // Add the created files to the DB
    try {
      // Save dir file reference to DB
      const dir = (await models.File.findOrCreate({ where: {
        cnodeUserUUID: req.session.cnodeUserUUID,
        multihash: resizeResp.dir.dirCID,
        sourceFile: null,
        storagePath: resizeResp.dir.dirDestPath,
        type: 'dir'
      },
      transaction: t }))[0].dataValues

      // Save each file to the DB
      await Promise.all(resizeResp.files.map(async (fileResp) => {
        const file = (await models.File.findOrCreate({ where: {
          cnodeUserUUID: req.session.cnodeUserUUID,
          multihash: fileResp.multihash,
          sourceFile: fileResp.sourceFile,
          storagePath: fileResp.storagePath,
          type: 'image',
          dirMultihash: resizeResp.dir.dirCID,
          fileName: fileResp.sourceFile.split('/').slice(-1)[0]
        },
        transaction: t }))[0].dataValues

        req.logger.info('Added file', fileResp, file)
      }))

      req.logger.info('Added all files for dir', dir)
      req.logger.info(`route time = ${Date.now() - routestart}`)

      await t.commit()
      triggerSecondarySyncs(req)
      return successResponse({ dirCID: resizeResp.dir.dirCID })
    } catch (e) {
      await t.rollback()
      return errorResponseServerError(e)
    }
  }))

  app.get('/ipfs_peer_info', handleResponse(async (req, res) => {
    const ipfs = req.app.get('ipfsAPI')
    const ipfsIDObj = await getIPFSPeerId(ipfs, config)
    if (req.query.caller_ipfs_id) {
      try {
        req.logger.info(`Connection to ${req.query.caller_ipfs_id}`)
        await ipfs.swarm.connect(req.query.caller_ipfs_id)
      } catch (e) {
        if (!e.message.includes('dial to self')) {
          req.logger.error(e)
        }
      }
    }
    return successResponse(ipfsIDObj)
  }))

  /**
   * Serve IPFS data hosted by creator node and create download route using query string pattern
   * `...?filename=<file_name.mp3>`.
   * @param req
   * @param req.query
   * @param {string} req.query.filename filename to set as the content-disposition header
   * @param {boolean} req.query.fromFS whether or not to retrieve directly from the filesystem and
   * rehydrate IPFS asynchronously
   * @dev This route does not handle responses by design, so we can pipe the response to client.
   * TODO: It seems like handleResponse does work with piped responses, as seen from the track/stream endpoint.
   */
  app.get('/ipfs/:CID', getCID)

  /**
   * Serve images hosted by creator node on IPFS.
   * @param req
   * @param req.query
   * @param {string} req.query.filename the actual filename to retrieve w/in the IPFS directory (e.g. 480x480.jpg)
   * @param {boolean} req.query.fromFS whether or not to retrieve directly from the filesystem and
   * rehydrate IPFS asynchronously
   * @dev This route does not handle responses by design, so we can pipe the gateway response.
   * TODO: It seems like handleResponse does work with piped responses, as seen from the track/stream endpoint.
   */
  app.get('/ipfs/:dirCID/:filename', getDirCID)
}

module.exports.getCID = getCID
