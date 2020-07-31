const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const writeFile = promisify(fs.writeFile)
const multer = require('multer')
const getUuid = require('uuid/v4')
const axios = require('axios')
const mkdir = promisify(fs.mkdir)

const config = require('./config')
const models = require('./models')
const Utils = require('./utils')

const MAX_AUDIO_FILE_SIZE = parseInt(config.get('maxAudioFileSizeBytes')) // Default = 250,000,000 bytes = 250MB
const MAX_MEMORY_FILE_SIZE = parseInt(config.get('maxMemoryFileSizeBytes')) // Default = 50,000,000 bytes = 50MB

const ALLOWED_UPLOAD_FILE_EXTENSIONS = config.get('allowedUploadFileExtensions') // default set in config.json
const AUDIO_MIME_TYPE_REGEX = /audio\/(.*)/

/**
 * (1) Add file to IPFS; (2) save file to disk;
 * (3) add file via IPFS; (4) save file ref to DB
 * @dev - only call this function when file is not already stored to disk
 *      - if it is, then use saveFileToIPFSFromFS()
 */
async function saveFileFromBuffer (req, buffer, fileType) {
  // make sure user has authenticated before saving file
  if (!req.session.cnodeUserUUID) {
    throw new Error('User must be authenticated to save a file')
  }

  const ipfs = req.app.get('ipfsAPI')

  const multihash = (await ipfs.add(buffer, { pin: false }))[0].hash

  const dstPath = path.join(req.app.get('storagePath'), multihash)

  await writeFile(dstPath, buffer)

  // add reference to file to database
  const file = (await models.File.findOrCreate({ where: {
    cnodeUserUUID: req.session.cnodeUserUUID,
    multihash: multihash,
    sourceFile: req.fileName,
    storagePath: dstPath,
    type: fileType
  } }))[0].dataValues

  req.logger.info('\nAdded file:', multihash, 'file id', file.fileUUID)
  return { multihash: multihash, fileUUID: file.fileUUID }
}

/**
 * Save file to IPFS given file path.
 * - Add file to IPFS.
 * - Re-save file to disk under multihash.
 * - Save reference to file in DB.
 */
async function saveFileToIPFSFromFS (req, srcPath, fileType, sourceFile, transaction = null) {
  // make sure user has authenticated before saving file
  if (!req.session.cnodeUserUUID) {
    throw new Error('User must be authenticated to save a file')
  }

  const ipfs = req.app.get('ipfsAPI')

  req.logger.info(`beginning saveFileToIPFSFromFS for srcPath ${srcPath}`)

  let codeBlockTimeStart = Date.now()

  const multihash = (await ipfs.addFromFs(srcPath, { pin: false }))[0].hash
  req.logger.info(`Time taken in saveFileToIpfsFromFS to add: ${Date.now() - codeBlockTimeStart}`)
  codeBlockTimeStart = Date.now()
  const dstPath = path.join(req.app.get('storagePath'), multihash)

  // store segment file copy under multihash for easy future retrieval
  fs.copyFileSync(srcPath, dstPath)

  req.logger.info(`Time taken in saveFileToIpfsFromFS to copyFileSync: ${Date.now() - codeBlockTimeStart}`)

  // add reference to file to database
  const queryObj = { where: {
    cnodeUserUUID: req.session.cnodeUserUUID,
    multihash: multihash,
    sourceFile: sourceFile,
    storagePath: dstPath,
    type: fileType
  } }
  if (transaction) {
    queryObj.transaction = transaction
  }
  const file = ((await models.File.findOrCreate(queryObj))[0].dataValues)

  req.logger.info(`Added file: ${multihash} for fileUUID ${file.fileUUID} from sourceFile ${sourceFile}`)
  return { multihash: multihash, fileUUID: file.fileUUID }
}

/**
 * Given a CID, saves the file to disk. Steps to achieve that:
 * 1. do the prep work to save the file to the local file system including
 * creating directories, changing IPFS gateway urls before calling _saveFileForMultihash
 * 2. attempt to fetch the CID from a variety of sources
 * 3. throws error if failure, couldn't find the file or file contents don't match CID,
 * returns expectedStoragePath if successful
 * @param {Object} req request object
 * @param {String} multihash IPFS cid
 * @param {String} expectedStoragePath file system path similar to `/file_storage/Qm1`
 *                  for non dir files and `/file_storage/Qmdir/Qm2` for dir files
 * @param {Array} gatewaysToTry List of gateway endpoints to try
 * @param {String?} fileNameForImage file name if the multihash is image in dir.
 *                  eg original.jpg or 150x150.jpg
 */
async function saveFileForMultihash (req, multihash, expectedStoragePath, gatewaysToTry, fileNameForImage = null) {
  const storagePath = req.app.get('storagePath') // should be `/file_storage'

  // will be modified to directory compatible route later if directory
  // TODO - don't concat url's by hand like this, use module like urljoin
  let gatewayUrlsMapped = gatewaysToTry.map(endpoint => `${endpoint.replace(/\/$/, '')}/ipfs/${multihash}`)

  // Check if the file we are trying to copy is in a directory and if so, create the directory first
  // E.g if the expectedStoragePath includes a dir like /file_storage/QmABC/Qm123, path.parse gives us
  // { root: '/', dir: '/file_storage/QmABC', base: 'Qm123',ext: '', name: 'Qm2' }
  // but if expectedStoragePath is a file like /file_storage/Qm123, path.parse gives us
  // { root: '/', dir: '/file_storage', base: 'Qm123', ext: '', name: 'Qm123' }
  // In the case where the parsed expectedStoragePath dir contains storagePath (`/file_storage`)
  // but does not equal it, we know that it's a directory
  const parsedStoragePath = path.parse(expectedStoragePath).dir
  if (parsedStoragePath !== storagePath && parsedStoragePath.includes(storagePath) && fileNameForImage) {
    const splitPath = parsedStoragePath.split('/')
    // parsedStoragePath looks like '/file_storage/Qm123' for a dir and when you call split, the result is
    // ['', 'file_storage', 'Qm123']. the third item in the array is the directory cid, so index 2
    if (splitPath.length !== 3) throw new Error(`saveFileForMultihash - Invalid expectedStoragePath for directory ${expectedStoragePath}`)

    // override gateway urls to make it compatible with directory
    gatewayUrlsMapped = gatewaysToTry.map(endpoint => `${endpoint.replace(/\/$/, '')}/ipfs/${splitPath[2]}/${fileNameForImage}`)

    try {
      // calling this on an existing directory doesn't overwrite the existing data or throw an error
      // the mkdir recursive is equivalent to `mkdir -p`
      await mkdir(parsedStoragePath, { recursive: true })
    } catch (e) {
      throw new Error(`saveFileForMultihash - Error making directory at ${parsedStoragePath} - ${e.message}`)
    }
  }

  /**
   * Attempts to fetch CID:
   *  - If file already stored on disk, return immediately and store to disk.
   *  - If file not already stored, fetch from IPFS and store to disk. First calls
   *    IPFS cat, then calls IPFS get
   *  - If file is not available via IPFS try other cnode gateways for user's replica set.
   */

  // If file already stored on disk, return immediately.
  if (fs.existsSync(expectedStoragePath)) {
    req.logger.debug(`saveFileForMultihash - File already stored at ${expectedStoragePath} for ${multihash}`)
    return expectedStoragePath
  }

  // If file not already stored, fetch and store at storagePath.
  let fileFound = false

  // If multihash already available on local ipfs node, cat file from local ipfs node
  req.logger.debug(`saveFileForMultihash - checking if ${multihash} already available on local ipfs node`)
  try {
    // ipfsCat returns a Buffer
    let fileBuffer = await Utils.ipfsCat(multihash, req, 1000)
    fileFound = true
    req.logger.debug(`saveFileForMultihash - Retrieved file for ${multihash} from local ipfs node`)
    // Write file to disk.
    await writeFile(expectedStoragePath, fileBuffer)
    req.logger.info(`saveFileForMultihash - wrote file to ${expectedStoragePath}, obtained via ipfs cat`)
  } catch (e) {
    req.logger.info(`saveFileForMultihash - Multihash ${multihash} is not available on local ipfs node`)
  }

  // If file not already available on local ipfs node, fetch from IPFS.
  if (!fileFound) {
    req.logger.debug(`saveFileForMultihash - Attempting to get ${multihash} from IPFS`)
    try {
      // ipfsGet returns a BufferListStream object which is not a buffer
      // not compatible into writeFile directly, but it can be streamed to a file
      let fileBL = await Utils.ipfsGet(multihash, req, 5000)
      req.logger.debug(`saveFileForMultihash - retrieved file for multihash ${multihash} from local ipfs node`)

      // Write file to disk.
      const destinationStream = fs.createWriteStream(expectedStoragePath)
      fileBL.pipe(destinationStream)
      await new Promise((resolve, reject) => {
        destinationStream.on('finish', () => {
          fileFound = true
          resolve()
        })
        destinationStream.on('error', err => { reject(err) })
        fileBL.on('error', err => { destinationStream.end(); reject(err) })
      })
      req.logger.info(`saveFileForMultihash - wrote file to ${expectedStoragePath}, obtained via ipfs get`)
    } catch (e) {
      req.logger.info(`saveFileForMultihash - Failed to retrieve file for multihash ${multihash} from IPFS ${e.message}`)
    }
  }

  // if file is still null, try to fetch from other cnode gateways if user has nodes in replica set
  if (!fileFound && gatewayUrlsMapped.length > 0) {
    try {
      let response
      // ..replace(/\/$/, "") removes trailing slashes
      req.logger.debug(`saveFileForMultihash - Attempting to fetch multihash ${multihash} by racing replica set endpoints`)

      // Note - Requests are intentionally not parallel to minimize additional load on gateways
      for (let index = 0; index < gatewayUrlsMapped.length; index++) {
        const url = gatewayUrlsMapped[index]
        try {
          const resp = await axios({
            method: 'get',
            url,
            responseType: 'stream',
            timeout: 20000 /* 20 sec - higher timeout to allow enough time to fetch copy320 */
          })
          if (resp.data) {
            response = resp
            break
          }
        } catch (e) {
          req.logger.error(`Error fetching file from other cnode ${url} ${e.message}`)
          continue
        }
      }

      if (!response || !response.data) {
        throw new Error(`Couldn't find files on other creator nodes`)
      }

      const destinationStream = fs.createWriteStream(expectedStoragePath)
      response.data.pipe(destinationStream)
      await new Promise((resolve, reject) => {
        destinationStream.on('finish', () => {
          fileFound = true
          resolve()
        })
        destinationStream.on('error', err => { reject(err) })
        response.data.on('error', err => { destinationStream.end(); reject(err) })
      })

      req.logger.info(`saveFileForMultihash - wrote file to ${expectedStoragePath}`)
    } catch (e) {
      throw new Error(`Failed to retrieve file for multihash ${multihash} from other creator node gateways: ${e.message}`)
    }
  }

  // file was not found on ipfs or any gateway
  if (!fileFound) {
    throw new Error(`Failed to retrieve file for multihash ${multihash} after trying ipfs & other creator node gateways`)
  }

  // for verification purposes - don't delete. verifies that the contents of the file match the file's cid
  const ipfs = req.app.get('ipfsLatestAPI')
  const content = fs.createReadStream(expectedStoragePath)
  for await (const result of ipfs.add(content, { onlyHash: true, timeout: 2000 })) {
    if (multihash !== result.cid.toString()) {
      throw new Error(`File contents don't match IPFS hash multihash: ${multihash} result: ${result.cid.toString()}`)
    }
  }

  return expectedStoragePath
}

/** (1) Remove all files in requested fileDir
 *  (2) Confirm the only subdirectory is 'fileDir/segments'
 *  (3) Remove all files in 'fileDir/segments' - throw if any subdirectories found
 *  (4) Remove 'fileDir/segments' and fileDir
 */
function removeTrackFolder (req, fileDir) {
  try {
    let fileDirInfo = fs.lstatSync(fileDir)
    if (!fileDirInfo.isDirectory()) {
      throw new Error('Expected directory input')
    }

    const files = fs.readdirSync(fileDir)
    // Remove all files in working track folder
    files.forEach((file, index) => {
      let curPath = path.join(fileDir, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        // Only the 'segments' subdirectory is expected
        if (file !== 'segments') {
          throw new Error(`Unexpected subdirectory in ${fileDir} - ${curPath}`)
        }
        const segmentFiles = fs.readdirSync(curPath)
        segmentFiles.forEach((sFile, sIndex) => {
          let curSegmentPath = path.join(curPath, sFile)
          // Throw if a subdirectory found in <uuid>/segments
          if (fs.lstatSync(curSegmentPath).isDirectory()) {
            throw new Error(`Unexpected subdirectory in segments ${fileDir} - ${curPath}`)
          }

          // Remove segment file
          fs.unlinkSync(curSegmentPath)
        })
        fs.rmdirSync(curPath)
      } else {
        // Remove file
        req.logger.info(`Removing ${curPath}`)
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(fileDir)
  } catch (err) {
    req.logger.error(`Error removing ${fileDir}. ${err}`)
  }
}

// Simple in-memory storage for metadata/generic files
const memoryStorage = multer.memoryStorage()
const upload = multer({
  limits: { fileSize: MAX_MEMORY_FILE_SIZE },
  storage: memoryStorage
})

// Simple temp storage for metadata/generic files
const tempDiskStorage = multer.diskStorage({})
const uploadTempDiskStorage = multer({
  limits: { fileSize: MAX_MEMORY_FILE_SIZE },
  storage: tempDiskStorage
})

// Custom on-disk storage for track files to prep for segmentation
const trackDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // save file under randomly named folders to avoid collisions
    const randomFileName = getUuid()
    const fileDir = path.join(req.app.get('storagePath'), randomFileName)

    // create directories for original file and segments
    fs.mkdirSync(fileDir)
    fs.mkdirSync(fileDir + '/segments')

    req.fileDir = fileDir
    const fileExtension = getFileExtension(file.originalname)
    req.fileName = randomFileName + fileExtension

    cb(null, fileDir)
  },
  filename: function (req, file, cb) {
    cb(null, req.fileName)
  }
})

const trackFileUpload = multer({
  storage: trackDiskStorage,
  limits: { fileSize: MAX_AUDIO_FILE_SIZE },
  fileFilter: function (req, file, cb) {
    // the function should call `cb` with a boolean to indicate if the file should be accepted
    if (ALLOWED_UPLOAD_FILE_EXTENSIONS.includes(getFileExtension(file.originalname).slice(1)) && AUDIO_MIME_TYPE_REGEX.test(file.mimetype)) {
      req.logger.info(`Filetype : ${getFileExtension(file.originalname).slice(1)}`)
      req.logger.info(`Mimetype: ${file.mimetype}`)
      cb(null, true)
    } else {
      req.fileFilterError = `File type not accepted. Must be one of [${ALLOWED_UPLOAD_FILE_EXTENSIONS}]`
      cb(null, false)
    }
  }
})

const handleTrackContentUpload = (req, res, next) => {
  trackFileUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.fileSizeError = err
      }
    }
    next()
  })
}

function getFileExtension (fileName) {
  return (fileName.lastIndexOf('.') >= 0) ? fileName.substr(fileName.lastIndexOf('.')).toLowerCase() : ''
}

module.exports = {
  saveFileFromBuffer,
  saveFileToIPFSFromFS,
  saveFileForMultihash,
  removeTrackFolder,
  upload,
  uploadTempDiskStorage,
  trackFileUpload,
  handleTrackContentUpload
}
