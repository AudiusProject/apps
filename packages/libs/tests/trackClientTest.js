const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let audiusInstance = helpers.audiusInstance

let trackMultihashDecoded = Utils.decodeMultihash(
  helpers.constants.trackMetadataCID
)
let trackMultihashDecoded2 = Utils.decodeMultihash(
  helpers.constants.trackMetadataCID2
)

let creatorId1
let creatorId2
let trackId1
let trackId2

before(async function () {
  await audiusInstance.init()
})

it('should call getTrack on invalid value and return empty', async function () {
  let track = await audiusInstance.contracts.TrackFactoryClient.getTrack(0)
  assert.strictEqual(track.multihashDigest, helpers.constants['0x0'])
})

it('should call addTrack', async function () {
  let handle = 'dheeraj' + Math.floor(Math.random() * 10000000)

  creatorId1 = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle)
  ).userId

  if (creatorId1 && Number.isInteger(creatorId1)) {
    trackId1 = (
      await audiusInstance.contracts.TrackFactoryClient.addTrack(
        creatorId1,
        trackMultihashDecoded.digest,
        trackMultihashDecoded.hashFn,
        trackMultihashDecoded.size
      )
    ).trackId
    let track =
      await audiusInstance.contracts.TrackFactoryClient.getTrack(trackId1)
    assert.strictEqual(track.multihashDigest, trackMultihashDecoded.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call updateTrack', async function () {
  const handle = 'skippy' + Math.floor(Math.random() * 10000000)

  creatorId2 = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle)
  ).userId

  if (creatorId2 && Number.isInteger(creatorId2)) {
    trackId1 = (
      await audiusInstance.contracts.TrackFactoryClient.addTrack(
        creatorId2,
        trackMultihashDecoded.digest,
        trackMultihashDecoded.hashFn,
        trackMultihashDecoded.size
      )
    ).trackId
    let track =
      await audiusInstance.contracts.TrackFactoryClient.getTrack(trackId1)
    assert.strictEqual(track.multihashDigest, trackMultihashDecoded.digest)

    await audiusInstance.contracts.TrackFactoryClient.updateTrack(
      trackId1,
      creatorId2,
      trackMultihashDecoded2.digest,
      trackMultihashDecoded2.hashFn,
      trackMultihashDecoded2.size
    )
    track = await audiusInstance.contracts.TrackFactoryClient.getTrack(trackId1)
    assert.strictEqual(track.multihashDigest, trackMultihashDecoded2.digest)
  } else throw new Error('creatorId is not a valid integer')
})

it('should call deleteTrack', async function () {
  trackId2 = (
    await audiusInstance.contracts.TrackFactoryClient.addTrack(
      creatorId2,
      trackMultihashDecoded.digest,
      trackMultihashDecoded.hashFn,
      trackMultihashDecoded.size
    )
  ).trackId
  let track =
    await audiusInstance.contracts.TrackFactoryClient.getTrack(trackId2)
  assert.strictEqual(track.multihashDigest, trackMultihashDecoded.digest)

  let { trackId } =
    await audiusInstance.contracts.TrackFactoryClient.deleteTrack(trackId2)
  assert.strictEqual(trackId, trackId2)
})
