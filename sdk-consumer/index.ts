import {
  EntityManager,
  RepostTrackRequest,
  FavoriteTrackRequest,
  sdk,
  UnrepostTrackRequest,
  UnfavoriteTrackRequest,
  UpdateTrackRequest,
  FollowUserRequest,
  UnfollowUserRequest,
  UploadTrackRequest,
  DeleteTrackRequest,
  developmentConfig,
  SubscribeToUserRequest,
  UnsubscribeFromUserRequest,
  RepostPlaylistRequest,
  FavoritePlaylistRequest,
  UnrepostPlaylistRequest,
  UnfavoritePlaylistRequest,
  UploadPlaylistRequest,
  CreatePlaylistRequest,
  PublishPlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  UploadAlbumRequest,
  UpdateAlbumRequest,
  DeletePlaylistRequest,
  DeleteAlbumRequest,
  FavoriteAlbumRequest,
  UnfavoriteAlbumRequest,
  RepostAlbumRequest,
  UnrepostAlbumRequest,
  UpdateProfileRequest,
  Logger,
  StorageNodeSelector,
  AppAuth,
  stagingConfig
} from '@audius/sdk'
import express from 'express'
import multer from 'multer'

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const app = express()
app.use(express.json())
app.use(express.urlencoded())
const port = 3100

// Test/develop sdk functionality here

const logger = new Logger({ logLevel: 'info' })
const apiKey = ''
const apiSecret = ''

const audiusSdk = sdk({
  services: {
    entityManager: new EntityManager({
      web3ProviderUrl: stagingConfig.web3ProviderUrl,
      contractAddress: stagingConfig.entityManagerContractAddress,
      identityServiceUrl: stagingConfig.identityServiceUrl,
      logger
    }),
    storageNodeSelector: new StorageNodeSelector({
      auth: new AppAuth(apiKey, apiSecret),
      bootstrapNodes: stagingConfig.storageNodes
    }),
    logger
  },
  apiKey,
  apiSecret
})

app.listen(port, () => {
  console.log(`sdk-consumer listening on port ${port}`)
})

const trackUpload = upload.fields([
  { name: 'coverArtFile', maxCount: 1 },
  { name: 'trackFile', maxCount: 1 }
])

type MulterFiles =
  | {
      [fieldname: string]: Express.Multer.File[]
    }
  | undefined

app.post<UploadTrackRequest>(
  '/uploadTrack',
  trackUpload as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]
      const trackFile = (req.files as MulterFiles)?.['trackFile'][0]

      if (coverArtFile && trackFile) {
        const inputMetadata = JSON.parse(req.body.metadata)
        inputMetadata.releaseDate = inputMetadata.releaseDate
          ? new Date(inputMetadata.releaseDate)
          : inputMetadata.releaseDate

        const uploadTrackRequest: UploadTrackRequest = {
          userId: req.body.userId,
          coverArtFile: {
            buffer: coverArtFile?.buffer,
            name: coverArtFile.originalname
          },
          metadata: inputMetadata,
          onProgress: (progress) => console.log('Progress:', progress),
          trackFile: {
            buffer: trackFile?.buffer,
            name: trackFile.originalname
          }
        }
        const result = await audiusSdk.tracks.uploadTrack(uploadTrackRequest)
        res.send(result)
      }
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

const trackUpdate = upload.fields([{ name: 'coverArtFile', maxCount: 1 }])

app.post<UpdateTrackRequest>(
  '/updateTrack',
  trackUpdate as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile']?.[0]

      const inputMetadata = JSON.parse(req.body.metadata)
      inputMetadata.releaseDate = inputMetadata.releaseDate
        ? new Date(inputMetadata.releaseDate)
        : inputMetadata.releaseDate

      const updateTrackRequest: any = {
        userId: req.body.userId,
        trackId: req.body.trackId,
        coverArtFile: coverArtFile && {
          buffer: coverArtFile?.buffer,
          name: coverArtFile.originalname
        },
        metadata: inputMetadata,
        onProgress: (progress: any) => console.log('Progress:', progress)
      }
      const result = await audiusSdk.tracks.updateTrack(updateTrackRequest)
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

app.post<DeleteTrackRequest>('/deleteTrack', async (req, res) => {
  try {
    const deleteTrackRequest: DeleteTrackRequest = {
      userId: req.body.userId,
      trackId: req.body.trackId
    }
    const result = await audiusSdk.tracks.deleteTrack(deleteTrackRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<FavoriteTrackRequest>('/favoriteTrack', async (req, res) => {
  try {
    const favoriteTrackRequest: FavoriteTrackRequest = {
      userId: req.body.userId,
      trackId: req.body.trackId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.tracks.favoriteTrack(favoriteTrackRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnfavoriteTrackRequest>('/unfavoriteTrack', async (req, res) => {
  try {
    const unfavoriteTrackRequest: UnfavoriteTrackRequest = {
      userId: req.body.userId,
      trackId: req.body.trackId
    }
    const result = await audiusSdk.tracks.unfavoriteTrack(
      unfavoriteTrackRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<RepostTrackRequest>('/repostTrack', async (req, res) => {
  try {
    const repostTrackRequest: RepostTrackRequest = {
      userId: req.body.userId,
      trackId: req.body.trackId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.tracks.repostTrack(repostTrackRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnrepostTrackRequest>('/unrepostTrack', async (req, res) => {
  try {
    const unrepostTrackRequest: UnrepostTrackRequest = {
      userId: req.body.userId,
      trackId: req.body.trackId
    }
    const result = await audiusSdk.tracks.unrepostTrack(unrepostTrackRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

const playlistCreation = upload.fields([{ name: 'coverArtFile', maxCount: 1 }])

app.post<CreatePlaylistRequest>(
  '/createPlaylist',
  playlistCreation as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]

      if (coverArtFile) {
        const inputMetadata = JSON.parse(req.body.metadata)

        const createPlaylistRequest: CreatePlaylistRequest = {
          userId: req.body.userId,
          coverArtFile: {
            buffer: coverArtFile?.buffer,
            name: coverArtFile.originalname
          },
          metadata: inputMetadata,
          trackIds: JSON.parse(req.body.trackIds),
          onProgress: (progress) => console.log('Progress:', progress)
        }
        const result = await audiusSdk.playlists.createPlaylist(
          createPlaylistRequest
        )
        res.send(result)
      }
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

const playlistUpload = upload.fields([
  { name: 'coverArtFile', maxCount: 1 },
  { name: 'trackFiles' }
])

app.post<UploadPlaylistRequest>(
  '/uploadPlaylist',
  playlistUpload as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]
      const trackFiles = (req.files as MulterFiles)?.['trackFiles']

      if (coverArtFile && trackFiles?.length) {
        const inputMetadata = JSON.parse(req.body.metadata)
        inputMetadata.releaseDate = inputMetadata.releaseDate
          ? new Date(inputMetadata.releaseDate)
          : inputMetadata.releaseDate

        const inputTrackMetadatas = JSON.parse(req.body.trackMetadatas)

        const uploadPlaylistRequest: UploadPlaylistRequest = {
          userId: req.body.userId,
          coverArtFile: {
            buffer: coverArtFile?.buffer,
            name: coverArtFile.originalname
          },
          metadata: inputMetadata,
          onProgress: (progress) => console.log('Progress:', progress),
          trackMetadatas: inputTrackMetadatas,
          trackFiles: trackFiles.map((trackFile) => ({
            buffer: trackFile?.buffer,
            name: trackFile.originalname
          }))
        }
        const result = await audiusSdk.playlists.uploadPlaylist(
          uploadPlaylistRequest
        )
        res.send(result)
      }
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

const playlistUpdate = upload.fields([{ name: 'coverArtFile', maxCount: 1 }])

app.post<UpdatePlaylistRequest>(
  '/updatePlaylist',
  playlistUpdate as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]

      const inputMetadata = JSON.parse(req.body.metadata)
      inputMetadata.releaseDate = inputMetadata.releaseDate
        ? new Date(inputMetadata.releaseDate)
        : inputMetadata.releaseDate

      const updatePlaylistRequest: UpdatePlaylistRequest = {
        userId: req.body.userId,
        playlistId: req.body.playlistId,
        coverArtFile: coverArtFile && {
          buffer: coverArtFile?.buffer,
          name: coverArtFile.originalname
        },
        metadata: inputMetadata,
        onProgress: (progress) => console.log('Progress:', progress)
      }
      const result = await audiusSdk.playlists.updatePlaylist(
        updatePlaylistRequest
      )
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

app.post<PublishPlaylistRequest>('/publishPlaylist', async (req, res) => {
  try {
    const publishPlaylistRequest: PublishPlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId
    }
    const result = await audiusSdk.playlists.publishPlaylist(
      publishPlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<AddTrackToPlaylistRequest>('/addTrackToPlaylist', async (req, res) => {
  try {
    const addTrackToPlaylistRequest: AddTrackToPlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId,
      trackId: req.body.trackId
    }
    const result = await audiusSdk.playlists.addTrackToPlaylist(
      addTrackToPlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<RemoveTrackFromPlaylistRequest>(
  '/removeTrackFromPlaylist',
  async (req, res) => {
    try {
      const removeTrackFromPlaylistRequest: RemoveTrackFromPlaylistRequest = {
        userId: req.body.userId,
        playlistId: req.body.playlistId,
        trackIndex: req.body.trackIndex
      }
      const result = await audiusSdk.playlists.removeTrackFromPlaylist(
        removeTrackFromPlaylistRequest
      )
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

app.post<DeletePlaylistRequest>('/deletePlaylist', async (req, res) => {
  try {
    const deletePlaylistRequest: DeletePlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId
    }
    const result = await audiusSdk.playlists.deletePlaylist(
      deletePlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<FavoritePlaylistRequest>('/favoritePlaylist', async (req, res) => {
  try {
    const favoritePlaylistRequest: FavoritePlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.playlists.favoritePlaylist(
      favoritePlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnfavoritePlaylistRequest>('/unfavoritePlaylist', async (req, res) => {
  try {
    const unfavoritePlaylistRequest: UnfavoritePlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId
    }
    const result = await audiusSdk.playlists.unfavoritePlaylist(
      unfavoritePlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<RepostPlaylistRequest>('/repostPlaylist', async (req, res) => {
  try {
    const repostPlaylistRequest: RepostPlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.playlists.repostPlaylist(
      repostPlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnrepostPlaylistRequest>('/unrepostPlaylist', async (req, res) => {
  try {
    const unrepostPlaylistRequest: UnrepostPlaylistRequest = {
      userId: req.body.userId,
      playlistId: req.body.playlistId
    }
    const result = await audiusSdk.playlists.unrepostPlaylist(
      unrepostPlaylistRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

const albumUpload = upload.fields([
  { name: 'coverArtFile', maxCount: 1 },
  { name: 'trackFiles' }
])

app.post<UploadAlbumRequest>(
  '/uploadAlbum',
  albumUpload as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]
      const trackFiles = (req.files as MulterFiles)?.['trackFiles']

      if (coverArtFile && trackFiles?.length) {
        const inputMetadata = JSON.parse(req.body.metadata)
        inputMetadata.releaseDate = inputMetadata.releaseDate
          ? new Date(inputMetadata.releaseDate)
          : inputMetadata.releaseDate

        const inputTrackMetadatas = JSON.parse(req.body.trackMetadatas)

        const uploadAlbumRequest: UploadAlbumRequest = {
          userId: req.body.userId,
          coverArtFile: {
            buffer: coverArtFile?.buffer,
            name: coverArtFile.originalname
          },
          metadata: inputMetadata,
          onProgress: (progress) => console.log('Progress:', progress),
          trackMetadatas: inputTrackMetadatas,
          trackFiles: trackFiles.map((trackFile) => ({
            buffer: trackFile?.buffer,
            name: trackFile.originalname
          }))
        }
        const result = await audiusSdk.albums.uploadAlbum(uploadAlbumRequest)
        res.send(result)
      }
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

const albumUpdate = upload.fields([{ name: 'coverArtFile', maxCount: 1 }])

app.post<UpdateAlbumRequest>(
  '/updateAlbum',
  albumUpdate as any,
  async (req, res) => {
    try {
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile'][0]

      const inputMetadata = JSON.parse(req.body.metadata)
      inputMetadata.releaseDate = inputMetadata.releaseDate
        ? new Date(inputMetadata.releaseDate)
        : inputMetadata.releaseDate

      const updateAlbumRequest: UpdateAlbumRequest = {
        userId: req.body.userId,
        albumId: req.body.albumId,
        coverArtFile: coverArtFile && {
          buffer: coverArtFile?.buffer,
          name: coverArtFile.originalname
        },
        metadata: inputMetadata,
        onProgress: (progress) => console.log('Progress:', progress)
      }
      const result = await audiusSdk.albums.updateAlbum(updateAlbumRequest)
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

app.post<DeleteAlbumRequest>('/deleteAlbum', async (req, res) => {
  try {
    const deleteAlbumRequest: DeleteAlbumRequest = {
      userId: req.body.userId,
      albumId: req.body.albumId
    }
    const result = await audiusSdk.albums.deleteAlbum(deleteAlbumRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<FavoriteAlbumRequest>('/favoriteAlbum', async (req, res) => {
  try {
    const favoriteAlbumRequest: FavoriteAlbumRequest = {
      userId: req.body.userId,
      albumId: req.body.albumId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.albums.favoriteAlbum(favoriteAlbumRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnfavoriteAlbumRequest>('/unfavoriteAlbum', async (req, res) => {
  try {
    const unfavoriteAlbumRequest: UnfavoriteAlbumRequest = {
      userId: req.body.userId,
      albumId: req.body.albumId
    }
    const result = await audiusSdk.albums.unfavoriteAlbum(
      unfavoriteAlbumRequest
    )
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<RepostAlbumRequest>('/repostAlbum', async (req, res) => {
  try {
    const repostAlbumRequest: RepostAlbumRequest = {
      userId: req.body.userId,
      albumId: req.body.albumId,
      metadata: req.body.metadata
    }
    const result = await audiusSdk.albums.repostAlbum(repostAlbumRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnrepostAlbumRequest>('/unrepostAlbum', async (req, res) => {
  try {
    const unrepostAlbumRequest: UnrepostAlbumRequest = {
      userId: req.body.userId,
      albumId: req.body.albumId
    }
    const result = await audiusSdk.albums.unrepostAlbum(unrepostAlbumRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

const profileUpdate = upload.fields([
  { name: 'profilePictureFile', maxCount: 1 },
  { name: 'coverArtFile', maxCount: 1 }
])

app.post<UpdateProfileRequest>(
  '/updateProfile',
  profileUpdate as any,
  async (req, res) => {
    try {
      const profilePictureFile = (req.files as MulterFiles)?.[
        'profilePictureFile'
      ]?.[0]
      const coverArtFile = (req.files as MulterFiles)?.['coverArtFile']?.[0]

      const updateProfileRequest: UpdateProfileRequest = {
        userId: req.body.userId,
        profilePictureFile: profilePictureFile && {
          buffer: profilePictureFile.buffer,
          name: profilePictureFile.originalname
        },
        coverArtFile: coverArtFile && {
          buffer: coverArtFile.buffer,
          name: coverArtFile.originalname
        },
        metadata: JSON.parse(req.body.metadata),
        onProgress: (progress: any) => console.log('Progress:', progress)
      }
      const result = await audiusSdk.users.updateProfile(updateProfileRequest)
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)

app.post<FollowUserRequest>('/followUser', async (req, res) => {
  try {
    const followUserRequest: FollowUserRequest = {
      userId: req.body.userId,
      followeeUserId: req.body.followeeUserId
    }
    const result = await audiusSdk.users.followUser(followUserRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnfollowUserRequest>('/unfollowUser', async (req, res) => {
  try {
    const unfollowUserRequest: UnfollowUserRequest = {
      userId: req.body.userId,
      followeeUserId: req.body.followeeUserId
    }
    const result = await audiusSdk.users.unfollowUser(unfollowUserRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<SubscribeToUserRequest>('/subscribeToUser', async (req, res) => {
  try {
    const subscribeToUserRequest: SubscribeToUserRequest = {
      userId: req.body.userId,
      subscribeeUserId: req.body.subscribeeUserId
    }
    const result = await audiusSdk.users.subscribeToUser(subscribeToUserRequest)
    res.send(result)
  } catch (e) {
    console.error(e)
    res.send((e as any).message)
  }
})

app.post<UnsubscribeFromUserRequest>(
  '/unsubscribeFromUser',
  async (req, res) => {
    try {
      const unsubscribeFromUserRequest: UnsubscribeFromUserRequest = {
        userId: req.body.userId,
        subscribeeUserId: req.body.subscribeeUserId
      }
      const result = await audiusSdk.users.unsubscribeFromUser(
        unsubscribeFromUserRequest
      )
      res.send(result)
    } catch (e) {
      console.error(e)
      res.send((e as any).message)
    }
  }
)
