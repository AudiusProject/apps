const assert = require('assert')
let helpers = require('./helpers')
let { Utils } = require('../src/utils')

let audiusInstance = helpers.audiusInstance

before(async function () {
  await audiusInstance.init()
})

it('Should add + delete track repost', async function () {
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle)
  ).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  const cid = helpers.constants.trackMetadataCID
  const trackMultihashDecoded = Utils.decodeMultihash(cid)
  const { trackId } =
    await audiusInstance.contracts.TrackFactoryClient.addTrack(
      creatorId,
      trackMultihashDecoded.digest,
      trackMultihashDecoded.hashFn,
      trackMultihashDecoded.size
    )
  assert.ok(trackId && Number.isInteger(trackId), 'invalid trackId')
  const track =
    await audiusInstance.contracts.TrackFactoryClient.getTrack(trackId)
  assert.strictEqual(
    track.multihashDigest,
    trackMultihashDecoded.digest,
    'Unexpected track multihash digest'
  )

  const addTrackRepostTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.addTrackRepost(
      creatorId,
      trackId
    )
  assert.ok(
    'TrackRepostAdded' in addTrackRepostTx.events,
    'Did not find TrackRepostAdded event in transaction'
  )

  const deleteTrackRepostTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.deleteTrackRepost(
      creatorId,
      trackId
    )
  assert.ok(
    'TrackRepostDeleted' in deleteTrackRepostTx.events,
    'Did not find TrackRepostDeleted event in transaction'
  )
})

it('Should add + delete playlist repost', async function () {
  const handle = 'sid' + Math.floor(Math.random() * 10000000)
  const creatorId = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle)
  ).userId
  assert.ok(creatorId && Number.isInteger(creatorId), 'invalid creatorId')

  const { playlistId } =
    await audiusInstance.contracts.PlaylistFactoryClient.createPlaylist(
      creatorId,
      'initialPlaylistName',
      false,
      false,
      []
    )
  assert.ok(playlistId && Number.isInteger(playlistId), 'invalid playlistId')

  const addPlaylistRepostTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.addPlaylistRepost(
      creatorId,
      playlistId
    )
  assert.ok(
    'PlaylistRepostAdded' in addPlaylistRepostTx.events,
    'Did not find PlaylistRepostAdded event in transaction'
  )

  const deletePlaylistRepostTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.deletePlaylistRepost(
      creatorId,
      playlistId
    )
  assert.ok(
    'PlaylistRepostDeleted' in deletePlaylistRepostTx.events,
    'Did not find PlaylistRepostDeleted event in transaction'
  )
})

it('Should add + delete user follow', async function () {
  const handle1 = '2sid_' + Math.floor(Math.random() + 10000000)
  const handle2 = '3sid_' + Math.floor(Math.random() + 10000000)
  const userId1 = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle1)
  ).userId
  const userId2 = (
    await audiusInstance.contracts.UserFactoryClient.addUser(handle2)
  ).userId
  assert.ok(userId1 && Number.isInteger(userId1), 'invalid userId')
  assert.ok(userId2 && Number.isInteger(userId2), 'invalid userId')

  const addUserFollowTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.addUserFollow(
      userId1,
      userId2
    )
  assert.ok(
    'UserFollowAdded' in addUserFollowTx.events,
    'Did not find UserFollowAdded event in transaction'
  )

  const deleteUserFollowTx =
    await audiusInstance.contracts.SocialFeatureFactoryClient.deleteUserFollow(
      userId1,
      userId2
    )
  assert.ok(
    'UserFollowDeleted' in deleteUserFollowTx.events,
    'Did not find UserFollowDeleted event in transaction'
  )
})
