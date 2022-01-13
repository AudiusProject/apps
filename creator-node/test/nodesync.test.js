const request = require('supertest')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')
const _ = require('lodash')
const nock = require('nock')
const sinon = require('sinon')

const config = require('../src/config')
const models = require('../src/models')
const { getApp, getServiceRegistryMock } = require('./lib/app')
const { getLibsMock } = require('./lib/libsMock')
const libsMock = getLibsMock()
const {
  createStarterCNodeUser,
  testEthereumConstants,
  destroyUsers
} = require('./lib/dataSeeds')
const BlacklistManager = require('../src/blacklistManager')
const ipfsClient = require('../src/ipfsClient')
const ipfs = ipfsClient.ipfs
const ipfsLatest = ipfsClient.ipfsLatest

const redisClient = require('../src/redis')
const { stringifiedDateFields } = require('./lib/utils')
const processSync = require('../src/services/sync/processSync')
const { uploadTrack } = require('./lib/helpers')
const primarySyncFromSecondary = require('../src/services/sync/primarySyncFromSecondary.js')

const testAudioFilePath = path.resolve(__dirname, 'testTrack.mp3')

/**
 * Sample export file must use `DUMMY_WALLET`, `DUMMY_CNODEUSER_BLOCKNUMBER`, `DUMMY_CID
 */
const DUMMY_WALLET = testEthereumConstants.pubKey.toLowerCase()
const DUMMY_CNODEUSER_BLOCKNUMBER = 10
const DUMMY_CID = 'QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE'
const DUMMY_CID_DATA = 'audius is cool'
const sampleExportDummyCIDPath = path.resolve(
  __dirname,
  'syncAssets/sampleExportDummyCID.json'
)
const sampleExportDummyCIDFromClock2Path = path.resolve(
  __dirname,
  'syncAssets/sampleExportDummyCIDFromClock2.json'
)

describe('test nodesync', async function () {
  let server, app, mockServiceRegistry, userId

  const originalMaxExportClockValueRange = config.get(
    'maxExportClockValueRange'
  )
  let maxExportClockValueRange = originalMaxExportClockValueRange

  userId = 1

  const setupDepsAndApp = async function () {
    const appInfo = await getApp(
      ipfs,
      libsMock,
      BlacklistManager,
      ipfsLatest,
      null,
      userId
    )
    server = appInfo.server
    app = appInfo.app
    mockServiceRegistry = appInfo.mockServiceRegistry
  }

  const unpackSampleExportData = (sampleExportFilePath) => {
    const sampleExport = JSON.parse(fs.readFileSync(sampleExportFilePath))
    const cnodeUser = Object.values(sampleExport.data.cnodeUsers)[0]
    const { audiusUsers, tracks, files, clockRecords } = cnodeUser

    return {
      sampleExport,
      cnodeUser,
      audiusUsers,
      tracks,
      files,
      clockRecords
    }
  }

  /** Wipe DB + Redis */
  beforeEach(async function () {
    try {
      await destroyUsers()
    } catch (e) {
      // do nothing
    }
    await redisClient.flushdb()
  })

  /**
   * Wipe DB, server, and redis state
   */
  afterEach(async function () {
    await sinon.restore()
    await server.close()
  })

  describe('test /export route', async function () {
    let cnodeUserUUID,
      sessionToken,
      metadataMultihash,
      metadataFileUUID,
      transcodedTrackCID,
      transcodedTrackUUID,
      trackSegments,
      sourceFile
    let trackMetadataMultihash, trackMetadataFileUUID

    const { pubKey } = testEthereumConstants

    const createUserAndTrack = async function () {
      // Create user
      ;({ cnodeUserUUID, sessionToken, userId } = await createStarterCNodeUser(
        userId
      ))

      // Upload user metadata
      const metadata = {
        metadata: {
          testField: 'testValue'
        }
      }
      const userMetadataResp = await request(app)
        .post('/audius_users/metadata')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send(metadata)
        .expect(200)
      metadataMultihash = userMetadataResp.body.data.metadataMultihash
      metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

      // Associate user with with blockchain ID
      const associateRequest = {
        blockchainUserId: 1,
        metadataFileUUID,
        blockNumber: 10
      }
      await request(app)
        .post('/audius_users')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send(associateRequest)
        .expect(200)

      /** Upload a track */

      const trackUploadResponse = await uploadTrack(
        testAudioFilePath,
        cnodeUserUUID,
        mockServiceRegistry.blacklistManager
      )

      transcodedTrackUUID = trackUploadResponse.transcodedTrackUUID
      trackSegments = trackUploadResponse.track_segments
      sourceFile = trackUploadResponse.source_file
      transcodedTrackCID = trackUploadResponse.transcodedTrackCID

      // Upload track metadata
      const trackMetadata = {
        metadata: {
          test: 'field1',
          owner_id: 1,
          track_segments: trackSegments
        },
        source_file: sourceFile
      }
      const trackMetadataResp = await request(app)
        .post('/tracks/metadata')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send(trackMetadata)
        .expect(200)
      trackMetadataMultihash = trackMetadataResp.body.data.metadataMultihash
      trackMetadataFileUUID = trackMetadataResp.body.data.metadataFileUUID

      // associate track + track metadata with blockchain ID
      await request(app)
        .post('/tracks')
        .set('X-Session-ID', sessionToken)
        .set('User-Id', userId)
        .send({
          blockchainTrackId: 1,
          blockNumber: 10,
          metadataFileUUID: trackMetadataFileUUID,
          transcodedTrackUUID
        })
    }

    describe('Confirm export object matches DB state with a user and track', async function () {
      beforeEach(setupDepsAndApp)

      beforeEach(createUserAndTrack)

      it('Test default export', async function () {
        // confirm maxExportClockValueRange > cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock <= maxExportClockValueRange)

        const exportResp = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}`
        )

        const exportOutputFilePath = path.resolve(
          __dirname,
          'syncAssets/realExport.json'
        )
        await fs.writeFile(exportOutputFilePath, JSON.stringify(exportResp.body, null, 2))

        return

        const exportBody = exportResp.body

        /**
         * Verify
         */

        // Get user metadata
        const userMetadataFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: metadataMultihash,
              fileUUID: metadataFileUUID,
              clock: 1
            },
            raw: true
          })
        )

        // get transcoded track file
        const copy320 = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: transcodedTrackCID,
              fileUUID: transcodedTrackUUID,
              type: 'copy320'
            },
            raw: true
          })
        )

        // get segment files
        const segmentHashes = trackSegments.map((t) => t.multihash)
        const segmentFiles = await Promise.all(
          segmentHashes.map(async (hash, i) => {
            const segment = await models.File.findOne({
              where: {
                multihash: hash,
                type: 'track'
              },
              raw: true
            })
            return stringifiedDateFields(segment)
          })
        )

        // Get track metadata file
        const trackMetadataFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              multihash: trackMetadataMultihash,
              fileUUID: trackMetadataFileUUID,
              clock: 36
            },
            raw: true
          })
        )

        // get audiusUser
        const audiusUser = stringifiedDateFields(
          await models.AudiusUser.findOne({
            where: {
              metadataFileUUID,
              clock: 2
            },
            raw: true
          })
        )

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )

        // get clock records
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: { cnodeUserUUID },
            raw: true
          })
        ).map(stringifiedDateFields)

        // get track file
        const trackFile = stringifiedDateFields(
          await models.Track.findOne({
            where: {
              cnodeUserUUID,
              metadataFileUUID: trackMetadataFileUUID
            },
            raw: true
          })
        )

        const clockInfo = {
          localClockMax: cnodeUser.clock,
          requestedClockRangeMin: 0,
          requestedClockRangeMax: maxExportClockValueRange - 1
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            audiusUsers: [audiusUser],
            tracks: [trackFile],
            files: [
              userMetadataFile,
              copy320,
              ...segmentFiles,
              trackMetadataFile
            ],
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(clockRecords.length, cnodeUserClock)
        assert.deepStrictEqual(exportedUserData, expectedData)
      })
    })

    describe('Confirm export works for user with data exceeding maxExportClockValueRange', async function () {
      /**
       * override maxExportClockValueRange to smaller value for testing
       */
      beforeEach(async function () {
        maxExportClockValueRange = 10
        process.env.maxExportClockValueRange = maxExportClockValueRange
      })

      beforeEach(setupDepsAndApp)

      beforeEach(createUserAndTrack)

      /**
       * unset maxExportClockValueRange
       */
      afterEach(async function () {
        delete process.env.maxExportClockValueRange
      })

      it('Export from clock = 0', async function () {
        const requestedClockRangeMin = 0
        const requestedClockRangeMax = maxExportClockValueRange - 1

        // confirm maxExportClockValueRange < cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock > maxExportClockValueRange)

        const { body: exportBody } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}`
        )

        /**
         * Verify
         */

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = requestedClockRangeMax

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get audiusUsers
        const audiusUsers = (
          await models.AudiusUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get tracks
        const tracks = (
          await models.Track.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: requestedClockRangeMax
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            audiusUsers,
            tracks,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        // when requesting from 0, exported data set is 1 less than expected range since clock values are 1-indexed
        assert.deepStrictEqual(
          clockRecords.length,
          maxExportClockValueRange - 1
        )
      })

      it('Export from clock = 10', async function () {
        const clockRangeMin = 10
        const requestedClockRangeMin = clockRangeMin
        const requestedClockRangeMax =
          clockRangeMin + (maxExportClockValueRange - 1)

        // confirm maxExportClockValueRange < cnodeUser.clock
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(cnodeUserClock > maxExportClockValueRange)

        const { body: exportBody } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}&clock_range_min=${requestedClockRangeMin}`
        )

        /**
         * Verify
         */

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = requestedClockRangeMax

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get audiusUsers
        const audiusUsers = (
          await models.AudiusUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get tracks
        const tracks = (
          await models.Track.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: requestedClockRangeMax
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            audiusUsers,
            tracks,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        assert.deepStrictEqual(clockRecords.length, maxExportClockValueRange)
      })

      it('Export from clock = 30 where range exceeds final value', async function () {
        const clockRangeMin = 30
        const requestedClockRangeMin = clockRangeMin
        const requestedClockRangeMax =
          clockRangeMin + (maxExportClockValueRange - 1)

        // confirm cnodeUser.clock < (requestedClockRangeMin + maxExportClockValueRange)
        const cnodeUserClock = (
          await models.CNodeUser.findOne({
            where: { cnodeUserUUID },
            raw: true
          })
        ).clock
        assert.ok(
          cnodeUserClock < requestedClockRangeMin + maxExportClockValueRange
        )

        const { body: exportBody } = await request(app).get(
          `/export?wallet_public_key=${pubKey.toLowerCase()}&clock_range_min=${requestedClockRangeMin}`
        )

        /**
         * Verify
         */

        // get cnodeUser
        const cnodeUser = stringifiedDateFields(
          await models.CNodeUser.findOne({
            where: {
              cnodeUserUUID
            },
            raw: true
          })
        )
        cnodeUser.clock = Math.min(cnodeUser.clock, requestedClockRangeMax)

        // get clockRecords
        const clockRecords = (
          await models.ClockRecord.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // Get audiusUsers
        const audiusUsers = (
          await models.AudiusUser.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get tracks
        const tracks = (
          await models.Track.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        // get files
        const files = (
          await models.File.findAll({
            where: {
              cnodeUserUUID,
              clock: {
                [models.Sequelize.Op.gte]: requestedClockRangeMin,
                [models.Sequelize.Op.lte]: requestedClockRangeMax
              }
            },
            order: [['clock', 'ASC']],
            raw: true
          })
        ).map(stringifiedDateFields)

        const clockInfo = {
          requestedClockRangeMin,
          requestedClockRangeMax,
          localClockMax: cnodeUser.clock
        }

        // construct the expected response
        const expectedData = {
          [cnodeUserUUID]: {
            ...cnodeUser,
            audiusUsers,
            tracks,
            files,
            clockRecords,
            clockInfo
          }
        }

        // compare exported data
        const exportedUserData = exportBody.data.cnodeUsers
        assert.deepStrictEqual(exportedUserData, expectedData)
        assert.deepStrictEqual(
          clockRecords.length,
          cnodeUser.clock - requestedClockRangeMin + 1
        )
      })
    })
  })

  describe('Test processSync function', async function () {
    let serviceRegistryMock

    const TEST_ENDPOINT = 'http://test-cn.co'
    const { pubKey } = testEthereumConstants
    const userWallets = [pubKey.toLowerCase()]

    /**
     * Create local user with CNodeUser & AudiusUser state
     */
    const createUser = async function () {
      // Create CNodeUser
      const session = await createStarterCNodeUser(userId)

      // Upload user metadata
      const metadata = {
        metadata: {
          testField: 'testValue'
        }
      }
      const userMetadataResp = await request(app)
        .post('/audius_users/metadata')
        .set('X-Session-ID', session.sessionToken)
        .set('User-Id', session.userId)
        .send(metadata)
        .expect(200)

      const metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

      // Associate user with with blockchain ID
      const associateRequest = {
        blockchainUserId: 1,
        metadataFileUUID,
        blockNumber: 10
      }
      await request(app)
        .post('/audius_users')
        .set('X-Session-ID', session.sessionToken)
        .set('User-Id', session.userId)
        .send(associateRequest)
        .expect(200)

      return session.cnodeUserUUID
    }

    const setupMocks = (sampleExport) => {
      // Mock /export route response
      nock(TEST_ENDPOINT)
        .persist()
        .get((uri) => uri.includes('/export'))
        .reply(200, sampleExport)

      // This text 'audius is cool' is mapped to the hash in the dummy json data
      // If changes are made to the response body, make the corresponding changes to the hash too
      nock('http://mock-cn1.audius.co')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'audius is cool')

      nock('http://mock-cn2.audius.co')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'audius is cool')

      nock('http://mock-cn3.audius.co')
        .persist()
        .get((uri) =>
          uri.includes('/ipfs/QmSU6rdPHdTrVohDSfhVCBiobTMr6a3NvPz4J7nLWVDvmE')
        )
        .reply(200, 'audius is cool')
    }

    // Ensure user data in CNodeUser table is as expected
    const verifyLocalCNodeUserStateForUser = async (exportedCnodeUser) => {
      exportedCnodeUser = _.pick(exportedCnodeUser, [
        'cnodeUserUUID',
        'walletPublicKey',
        'lastLogin',
        'latestBlockNumber',
        'clock',
        'createdAt'
      ])

      const localCNodeUser = stringifiedDateFields(
        await models.CNodeUser.findOne({
          where: {
            walletPublicKey: exportedCnodeUser.walletPublicKey
          },
          raw: true
        })
      )

      assert.deepStrictEqual(
        _.omit(localCNodeUser, ['cnodeUserUUID', 'updatedAt']),
        _.omit(exportedCnodeUser, ['cnodeUserUUID', 'updatedAt'])
      )

      const newCNodeUserUUID = localCNodeUser.cnodeUserUUID
      return newCNodeUserUUID
    }

    /**
     * Verifies local state for user with CNodeUserUUID for AudiusUsers, Tracks, Files, and ClockRecords tables
     */
    const verifyLocalStateForUser = async ({
      cnodeUserUUID,
      exportedAudiusUsers,
      exportedClockRecords,
      exportedFiles,
      exportedTracks
    }) => {
      /**
       * Verify local AudiusUsers table state matches export
       */
      for (const exportedAudiusUser of exportedAudiusUsers) {
        const localAudiusUser = stringifiedDateFields(
          await models.AudiusUser.findOne({
            where: {
              cnodeUserUUID,
              clock: exportedAudiusUser.clock
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localAudiusUser, ['cnodeUserUUID']),
          _.omit(exportedAudiusUser, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local Tracks table state matches export
       */
      for (const exportedTrack of exportedTracks) {
        const { clock, blockchainId, metadataFileUUID } = exportedTrack
        const localFile = stringifiedDateFields(
          await models.Track.findOne({
            where: {
              clock,
              cnodeUserUUID,
              blockchainId,
              metadataFileUUID
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localFile, ['cnodeUserUUID']),
          _.omit(exportedTrack, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local Files table state matches export
       */
      for (const exportedFile of exportedFiles) {
        const { fileUUID, multihash, clock } = exportedFile
        const localFile = stringifiedDateFields(
          await models.File.findOne({
            where: {
              clock,
              cnodeUserUUID,
              multihash,
              fileUUID
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localFile, ['cnodeUserUUID']),
          _.omit(exportedFile, ['cnodeUserUUID'])
        )
      }

      /**
       * Verify local ClockRecords table state matches export
       */
      for (const exportedRecord of exportedClockRecords) {
        const { clock, sourceTable, createdAt, updatedAt } = exportedRecord
        const localRecord = stringifiedDateFields(
          await models.ClockRecord.findOne({
            where: {
              clock,
              cnodeUserUUID,
              sourceTable,
              createdAt,
              updatedAt
            },
            raw: true
          })
        )
        assert.deepStrictEqual(
          _.omit(localRecord, ['cnodeUserUUID']),
          _.omit(exportedRecord, ['cnodeUserUUID'])
        )
      }

      /**
       * TODO - Verify all expected files are on disk
       */
    }

    /**
     * Setup deps + mocks + app
     */
    beforeEach(async function () {
      nock.cleanAll()

      maxExportClockValueRange = originalMaxExportClockValueRange
      process.env.maxExportClockValueRange = maxExportClockValueRange

      // Mock ipfs.swarm.connect() function for test purposes
      ipfsClient.ipfs.swarm.connect = async function () {
        return { Strings: [] }
      }

      const appInfo = await getApp(
        ipfsClient.ipfs,
        libsMock,
        BlacklistManager,
        ipfsClient.ipfsLatest,
        null,
        userId
      )
      server = appInfo.server
      app = appInfo.app

      serviceRegistryMock = getServiceRegistryMock(
        ipfsClient.ipfs,
        libsMock,
        BlacklistManager,
        ipfsClient.ipfsLatest
      )
    })

    it('Syncs correctly from clean user state with mocked export object', async function () {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        audiusUsers: exportedAudiusUsers,
        tracks: exportedTracks,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDPath)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // Call processSync
      await processSync(serviceRegistryMock, userWallets, TEST_ENDPOINT)

      const newCNodeUserUUID = await verifyLocalCNodeUserStateForUser(
        exportedCnodeUser
      )

      await verifyLocalStateForUser({
        cnodeUserUUID: newCNodeUserUUID,
        exportedAudiusUsers,
        exportedClockRecords,
        exportedFiles,
        exportedTracks
      })
    })

    it('Syncs correctly when cnodeUser data already exists locally', async function () {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        audiusUsers: exportedAudiusUsers,
        tracks: exportedTracks,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDFromClock2Path)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // seed user state locally with different cnodeUserUUID
      const cnodeUserUUID = await createUser()

      // Confirm local user state exists before sync
      const localCNodeUserCount = await models.CNodeUser.count({
        where: { cnodeUserUUID }
      })
      assert.strictEqual(localCNodeUserCount, 1)

      // Call processSync
      await processSync(serviceRegistryMock, userWallets, TEST_ENDPOINT)

      await verifyLocalCNodeUserStateForUser(exportedCnodeUser)

      await verifyLocalStateForUser({
        cnodeUserUUID,
        exportedAudiusUsers,
        exportedClockRecords,
        exportedFiles,
        exportedTracks
      })
    })

    it('Syncs correctly when cnodeUser data already exists locally with `forceResync` = true', async () => {
      const {
        sampleExport,
        cnodeUser: exportedCnodeUser,
        audiusUsers: exportedAudiusUsers,
        tracks: exportedTracks,
        files: exportedFiles,
        clockRecords: exportedClockRecords
      } = unpackSampleExportData(sampleExportDummyCIDPath)

      setupMocks(sampleExport)

      // Confirm local user state is empty before sync
      const initialCNodeUserCount = await models.CNodeUser.count()
      assert.strictEqual(initialCNodeUserCount, 0)

      // seed local user state with different cnodeUserUUID
      const cnodeUserUUID = await createUser()

      // Confirm local user state exists before sync
      const localCNodeUserCount = await models.CNodeUser.count({
        where: { cnodeUserUUID }
      })
      assert.strictEqual(localCNodeUserCount, 1)

      // Call processSync with `forceResync` = true
      await processSync(
        serviceRegistryMock,
        userWallets,
        TEST_ENDPOINT,
        /* blockNumber */ null,
        /* forceResync */ true
      )

      const newCNodeUserUUID = await verifyLocalCNodeUserStateForUser(
        exportedCnodeUser
      )

      await verifyLocalStateForUser({
        cnodeUserUUID: newCNodeUserUUID,
        exportedAudiusUsers,
        exportedClockRecords,
        exportedFiles,
        exportedTracks
      })
    })
  })
})

describe.only('Test primarySyncFromSecondary() with mocked export', async () => {
  let server, app, serviceRegistryMock

  const NODES = {
    CN1: 'http://mock-cn1.audius.co',
    CN2: 'http://mock-cn2.audius.co',
    CN3: 'http://mock-cn3.audius.co'
  }
  const NODES_LIST = Object.values(NODES)
  const SELF = NODES.CN1
  const SECONDARY = NODES.CN3
  const USER_1_ID = 1
  const SP_ID_1 = 1
  const USER_1_WALLET = DUMMY_WALLET
  const USER_1_BLOCKNUMBER = DUMMY_CNODEUSER_BLOCKNUMBER

  const comparisonOmittedFields = ['cnodeUserUUID', 'createdAt', 'updatedAt']

  const unpackExportDataFromFile = (sampleExportFilePath) => {
    const sampleExport = JSON.parse(fs.readFileSync(sampleExportFilePath))
    const cnodeUserInfo = Object.values(sampleExport.data.cnodeUsers)[0]
    const cnodeUser = _.omit(cnodeUserInfo, ['audiusUsers', 'tracks', 'files', 'clockRecords', 'clockInfo'])
    const { audiusUsers, tracks, files, clockRecords, clockInfo } = cnodeUserInfo

    return {
      sampleExport,
      cnodeUser,
      audiusUsers,
      tracks,
      files,
      clockRecords,
      clockInfo
    }
  }

  /**
   * Sets `/export` route response from `endpoint` to `exportData`
   */
  const setupExportMock = (endpoint, exportData) => {
    nock(endpoint)
      .persist()
      .get((uri) => uri.includes('/export'))
      .reply(200, exportData)
  }

  const computeFilePathForCID = (CID) => {
    const directoryID = CID.slice(-4, -1)
    const parentDirPath = path.join(
      __dirname,
      'syncAssets/nodesync/test_file_storage',
      directoryID
    )
    const filePath = path.join(parentDirPath, CID)
    return filePath
  }

  /**
   * Sets `/ipfs` route responses for DUMMY_CID from all nodes to DUMMY_CID_DATA
   */
  const setupIPFSRouteMocks = () => {
    NODES_LIST.forEach(node => {
      nock(node)
      .persist()
      .get((uri) => uri.includes('/ipfs'))
      .reply(200, (uri, requestbody) => {
        const CID = uri.split('/ipfs/')[1].slice(0,46)
        const CIDFilePath = computeFilePathForCID(CID)
        const fileBuffer = fs.readFileSync(CIDFilePath)
        return fileBuffer
      })
    })
  }

  const fetchDBStateForWallet = async (walletPublicKey) => {
    const response = {
      cnodeUser: null,
      audiusUsers: null,
      tracks: null,
      files: null,
      clockRecords: null
    }

    const cnodeUser = stringifiedDateFields(
      await models.CNodeUser.findOne({
        where: {
          walletPublicKey
        },
        raw: true
      })
    )

    if (!cnodeUser || Object.keys(cnodeUser).length === 0) {
      return response
    } else {
      response.cnodeUser = cnodeUser
    }

    const cnodeUserUUID = cnodeUser.cnodeUserUUID

    const audiusUsers = (await models.AudiusUser.findAll({
      where: { cnodeUserUUID },
      raw: true
    })).map(stringifiedDateFields)
    response.audiusUsers = audiusUsers

    const tracks = (await models.Track.findAll({
      where: { cnodeUserUUID },
      raw: true
    })).map(stringifiedDateFields)
    response.tracks = tracks

    const files = (await models.File.findAll({
      where: { cnodeUserUUID },
      raw: true
    })).map(stringifiedDateFields)
    response.files = files

    const clockRecords = (await models.ClockRecord.findAll({
      where: { cnodeUserUUID },
      raw: true
    })).map(stringifiedDateFields)
    response.clockRecords = clockRecords

    return response
  }

  /**
   * Create local user with CNodeUser, AudiusUser, File, and ClockRecord state
   * @returns cnodeUserUUID
   */
  const createUser = async (userId, userWallet, blockNumber) => {
    // Create CNodeUser
    const session = await createStarterCNodeUser(userId, userWallet)

    // Upload user metadata
    const metadata = {
      metadata: {
        testField: 'testValue'
      }
    }
    const userMetadataResp = await request(app)
      .post('/audius_users/metadata')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send(metadata)
      .expect(200)

    const metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

    // Associate user with with blockchain ID
    const associateRequest = {
      blockchainUserId: userId,
      metadataFileUUID,
      blockNumber
    }
    await request(app)
      .post('/audius_users')
      .set('X-Session-ID', session.sessionToken)
      .set('User-Id', session.userId)
      .send(associateRequest)
      .expect(200)

    return session.cnodeUserUUID
  }

  const createUserAndTrack = async (testAssetsDirPath) => {
    // Create CNodeUser
    const { cnodeUserUUID, sessionToken } = await createStarterCNodeUser(USER_1_ID, USER_1_WALLET)

    // Upload user metadata
    const userMetadata = {
      metadata: {
        testField: 'testValue'
      }
    }

    // await fs.writeFile(
    //   path.resolve(testAssetsDirPath, 'userMetadata.json'),
    //   JSON.stringify(userMetadata, null, 2)
    // )

    const userMetadataResp = await request(app)
      .post('/audius_users/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', USER_1_ID)
      .send(userMetadata)
      .expect(200)
    const metadataMultihash = userMetadataResp.body.data.metadataMultihash
    const metadataFileUUID = userMetadataResp.body.data.metadataFileUUID

    // Associate user with with blockchain ID
    const associateRequest = {
      blockchainUserId: USER_1_ID,
      metadataFileUUID,
      blockNumber: USER_1_BLOCKNUMBER
    }
    await request(app)
      .post('/audius_users')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', USER_1_ID)
      .send(associateRequest)
      .expect(200)

    /** Upload a track */

    const trackUploadResponse = await uploadTrack(
      testAudioFilePath,
      cnodeUserUUID,
      serviceRegistryMock.blacklistManager
    )

    const transcodedTrackUUID = trackUploadResponse.transcodedTrackUUID
    const trackSegments = trackUploadResponse.track_segments
    const sourceFile = trackUploadResponse.source_file
    const transcodedTrackCID = trackUploadResponse.transcodedTrackCID

    // Upload track metadata
    const trackMetadata = {
      metadata: {
        test: 'field1',
        owner_id: USER_1_ID,
        track_segments: trackSegments
      },
      source_file: sourceFile
    }

    // await fs.writeFile(
    //   path.resolve(testAssetsDirPath, 'trackMetadata.json'),
    //   JSON.stringify(trackMetadata, null, 2)
    // )

    const trackMetadataResp = await request(app)
      .post('/tracks/metadata')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', USER_1_ID)
      .send(trackMetadata)
      .expect(200)
    const trackMetadataMultihash = trackMetadataResp.body.data.metadataMultihash
    const trackMetadataFileUUID = trackMetadataResp.body.data.metadataFileUUID

    // associate track + track metadata with blockchain ID
    await request(app)
      .post('/tracks')
      .set('X-Session-ID', sessionToken)
      .set('User-Id', USER_1_ID)
      .send({
        blockchainTrackId: USER_1_ID,
        blockNumber: USER_1_BLOCKNUMBER,
        metadataFileUUID: trackMetadataFileUUID,
        transcodedTrackUUID
      })

    const exportResp = await request(app).get(
      `/export?wallet_public_key=${USER_1_WALLET}`
    )
    const exportOutputFilePath = path.resolve(testAssetsDirPath, 'realExport.json')
    await fs.writeFile(exportOutputFilePath, JSON.stringify(exportResp.body, null, 2))
  }

  /**
   * Reset nocks, DB, redis
   * Setup mocks, deps
   */
  beforeEach(async () => {
    nock.cleanAll()

    try {
      await destroyUsers()
    } catch (e) {
      // do nothing
    }

    await redisClient.flushdb()

    // Mock ipfs.swarm.connect() function for test purposes
    ipfsClient.ipfs.swarm.connect = async () => {
      return { Strings: [] }
    }

    const appInfo = await getApp(
      ipfsClient.ipfs,
      libsMock,
      BlacklistManager,
      ipfsClient.ipfsLatest,
      null,
      SP_ID_1
    )
    server = appInfo.server
    app = appInfo.app

    serviceRegistryMock = getServiceRegistryMock(
      ipfsClient.ipfs,
      libsMock,
      BlacklistManager,
      ipfsClient.ipfsLatest
    )
  })

  it.skip('test', async () => {
    await createUserAndTrack(path.resolve(__dirname, 'syncAssets', 'nodesync'))
  })

  const exportFilePath = path.resolve(__dirname, 'syncAssets/nodesync/export.json')

  it('NEW Primary correctly syncs from secondary when primary has no state', async () => {
    const {
      sampleExport,
      cnodeUser: exportedCnodeUser,
      audiusUsers: exportedAudiusUsers,
      tracks: exportedTracks,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, sampleExport)
    setupIPFSRouteMocks()

    // Confirm local user state is empty before sync
    let { cnodeUser: localCNodeUser } = await fetchDBStateForWallet(USER_1_WALLET)
    assert.deepStrictEqual(localCNodeUser, null)

    await primarySyncFromSecondary({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      selfEndpoint: SELF
    })

    /**
     * Verify DB state after sync
     */
    ;({
      cnodeUser: localCNodeUser,
      audiusUsers: localAudiusUsers,
      tracks: localTracks,
      files: localFiles,
      clockRecords: localClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET))

    const comparisonOmittedFields = ['cnodeUserUUID', 'createdAt', 'updatedAt']

    assert.deepStrictEqual(
      _.omit(localCNodeUser, comparisonOmittedFields),
      _.omit(exportedCnodeUser, comparisonOmittedFields)
    )

    assert.deepStrictEqual(
      _.orderBy(
        localAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )
  })

  it('OLD Primary correctly syncs from secondary when primary has no state', async () => {
    const {
      sampleExport,
      cnodeUser: exportedCnodeUser,
      audiusUsers: exportedAudiusUsers,
      tracks: exportedTracks,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(sampleExportDummyCIDPath)

    setupExportMock(SECONDARY, sampleExport)
    setupIPFSRouteMocks()

    // Confirm local user state is empty before sync
    let { cnodeUser: localCNodeUser } = await fetchDBStateForWallet(USER_1_WALLET)
    assert.deepStrictEqual(localCNodeUser, null)

    await primarySyncFromSecondary({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      sourceEndpoint: SELF
    })

    /**
     * Verify DB state after sync
     */
    ;({
      cnodeUser: localCNodeUser,
      audiusUsers: localAudiusUsers,
      tracks: localTracks,
      files: localFiles,
      clockRecords: localClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET))

    const comparisonOmittedFields = ['cnodeUserUUID', 'createdAt', 'updatedAt']

    assert.deepStrictEqual(
      _.omit(localCNodeUser, comparisonOmittedFields),
      _.omit(exportedCnodeUser, comparisonOmittedFields)
    )

    assert.deepStrictEqual(
      _.orderBy(
        localAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )
  })

  it('Primary correctly syncs from secondary when primary has subset of secondary state', async () => {})

  it.only('Primary correctly syncs from secondary when nodes have divergent state', async () => {
    const {
      sampleExport,
      cnodeUser: exportedCnodeUser,
      audiusUsers: exportedAudiusUsers,
      tracks: exportedTracks,
      files: exportedFiles,
      clockRecords: exportedClockRecords
    } = unpackExportDataFromFile(exportFilePath)

    setupExportMock(SECONDARY, sampleExport)
    setupIPFSRouteMocks()

    // Confirm local user state is empty initially
    let { cnodeUser: localCNodeUser } = await fetchDBStateForWallet(USER_1_WALLET)
    assert.deepStrictEqual(localCNodeUser, null)

    // Add some local user state
    const localCNodeUserUUID = await createUser(USER_1_ID, USER_1_WALLET, USER_1_BLOCKNUMBER)

    // Confirm local user state is non-empty before sync
    ;({
      cnodeUser: localCNodeUser,
      audiusUsers: localAudiusUsers,
      tracks: localTracks,
      files: localFiles,
      clockRecords: localClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET))
    assert.deepStrictEqual(
      _.omit(localCNodeUser, ['cnodeUserUUID', 'lastLogin', 'createdAt', 'updatedAt']),
      {
        walletPublicKey: USER_1_WALLET,
        clock: 2,
        latestBlockNumber: USER_1_BLOCKNUMBER
      }
    )
    // TODO all other asserts

    

    return

    await primarySyncFromSecondary({
      serviceRegistry: serviceRegistryMock,
      secondary: SECONDARY,
      wallet: USER_1_WALLET,
      sourceEndpoint: SELF
    })

    return

    /**
     * Verify DB state after sync
     */
    ;({
      cnodeUser: localCNodeUser,
      audiusUsers: localAudiusUsers,
      tracks: localTracks,
      files: localFiles,
      clockRecords: localClockRecords
    } = await fetchDBStateForWallet(USER_1_WALLET))

    assert.deepStrictEqual(
      _.omit(localCNodeUser, comparisonOmittedFields),
      _.omit(exportedCnodeUser, comparisonOmittedFields)
    )

    assert.deepStrictEqual(
      _.orderBy(
        localAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedAudiusUsers.map(audiusUser => _.omit(audiusUser, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedTracks.map(track => _.omit(track, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedFiles.map(file => _.omit(file, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )

    assert.deepStrictEqual(
      _.orderBy(
        localClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      ),
      _.orderBy(
        exportedClockRecords.map(clockRecord => _.omit(clockRecord, comparisonOmittedFields)),
        ['clock'], ['asc']
      )
    )
  })

  it('Primary correctly syncs from secondary when secondary has state requiring multiple syncs', async () => {})
})
