const assert = require('assert')
const sinon = require('sinon')
const uuid = require('uuid/v4')
const fs = require('fs')
const path = require('path')

const { ipfs } = require('../src/ipfsClient')
const { saveFileToIPFSFromFS } = require('../src/fileManager')
const config = require('../src/config')
const models = require('../src/models')

let storagePath = config.get('storagePath')
storagePath = storagePath.charAt(0) === '/' ? storagePath.slice(1) : storagePath

const reqFnStubs = {
  ipfsAPI: ipfs,
  storagePath
}
const req = {
  session: {
    cnodeUserUUID: uuid()
  },
  logger: {
    info: () => {}
  },
  app: {
    get: key => {
      return reqFnStubs[key]
    }
  }
}
const segmentsDirPath = 'test/test-segments'
const sourceFile = 'segment001.ts'
const srcPath = path.join(segmentsDirPath, sourceFile)
const fileType = 'track'

describe('test saveFileToIpfsFromFs', () => {
  afterEach(function () {
    sinon.restore()
  })

  /**
   * Given: a file is being saved to ipfs from fs
   * When: the cnodeUserUUID is not present
   * Then: an error is thrown
   */
  it('should throw error if cnodeUserUUID is not present', async () => {
    const req = {
      session: {},
      logger: {
        info: () => {}
      },
      app: {
        get: () => { return path.join(storagePath) }
      }
    }

    try {
      await saveFileToIPFSFromFS(req, srcPath, fileType, sourceFile)
      assert.fail('Should not have passed if cnodeUserUUID is not present in request.')
    } catch (e) {
      assert.deepStrictEqual(e.message, 'User must be authenticated to save a file')
    }
  })

  /**
   * Given: a file is being saved to ipfs from fs
   * When: ipfs is down
   * Then: an error is thrown
   */
  it('should throw an error if ipfs is down', async () => {
    sinon.stub(ipfs, 'addFromFs').rejects(new Error('ipfs is down!'))

    try {
      await saveFileToIPFSFromFS(req, srcPath, fileType, sourceFile)
      assert.fail('Should not have passed if ipfs is down.')
    } catch (e) {
      assert.deepStrictEqual(e.message, 'ipfs is down!')
    }
  })

  /**
   * Given: a file is being saved to ipfs from fs
   * When: ipfs is down
   * Then: an error is thrown
   */
  it('should throw an error if file syncing fails', async () => {
    sinon.stub(fs, 'copyFileSync').throws(new Error('Failed to sync over files!!'))

    try {
      await saveFileToIPFSFromFS(req, srcPath, fileType, sourceFile)
      assert.fail('Should not have passed if file syncing fails.')
    } catch (e) {
      assert.deepStrictEqual(e.message, 'Failed to sync over files!!')
    }
  })

  /**
   * Given: a file is being saved to ipfs from fs
   * When: the db connection is down
   * Then: an error is thrown
   */
  it('should throw an error if db connection is down', async () => {
    sinon.stub(models.File, 'findOrCreate').rejects(new Error('Failed to find or create file!!!'))

    try {
      await saveFileToIPFSFromFS(req, srcPath, fileType, sourceFile)
      assert.fail('Should not have if db connection is down.')
    } catch (e) {
      assert.deepStrictEqual(e.message, 'Failed to find or create file!!!')
    }
  })

  /**
   * Given: a file is being saved to ipfs from fs
   * When: everything works as expected
   * Then:
   *  - 1 segment should be saved in <storagePath>/QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd
   *  - that segment content should match the original sourcefile
   *  - that segment should be present in IPFS
   */
  it('should pass (happy path)', async () => {
    sinon.stub(models.File, 'findOrCreate').returns([{ dataValues: 'data' }])

    try {
      await saveFileToIPFSFromFS(req, srcPath, fileType, sourceFile)
    } catch (e) {
      assert.fail(e.message)
    }

    // 1 segment should be saved in <storagePath>/QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd
    const segmentCID = 'QmSMQGu2vrE6UwXiZDCxyJwTsCcpPrYNBPJBL4by4LKukd'
    const syncedSegmentPath = path.join(storagePath, segmentCID)
    assert.ok(fs.existsSync(syncedSegmentPath))

    // the segment content should match the original sourcefile
    const syncedSegmentBuf = fs.readFileSync(syncedSegmentPath)
    const originalSegmentBuf = fs.readFileSync(srcPath)
    assert.deepStrictEqual(originalSegmentBuf.compare(syncedSegmentBuf), 0)

    // the segment should be present in IPFS
    let ipfsResp
    try {
      ipfsResp = await ipfs.cat(segmentCID)
    } catch (e) {
      // If CID is not present, will throw timeout error
      assert.fail(e.message)
    }

    assert.deepStrictEqual(originalSegmentBuf.compare(ipfsResp), 0)
  })
})
