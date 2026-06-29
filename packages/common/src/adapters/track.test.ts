import { Genre, Id, type Track as SdkTrack, type User } from '@audius/sdk'
import { describe, expect, it } from 'vitest'

import type { UserMetadata } from '~/models'
import type { TrackMetadataForUpload } from '~/store/upload/types'

import {
  getTrackCollaboratorsForEdit,
  trackMetadataForUploadToSdk,
  userTrackMetadataFromSDK
} from './track'

const makeMetadata = (
  overrides: Partial<TrackMetadataForUpload> = {}
): TrackMetadataForUpload =>
  ({
    title: 'Test Track',
    genre: Genre.Electronic,
    ...overrides
  }) as TrackMetadataForUpload

const makeUserMetadata = (id: number): UserMetadata =>
  ({
    user_id: id,
    handle: `user-${id}`,
    name: `User ${id}`
  }) as UserMetadata

const makeSdkUser = (id: number): User =>
  ({
    id: Id.parse(id),
    handle: `user-${id}`,
    name: `User ${id}`
  }) as User

const makeSdkTrack = (overrides: Partial<SdkTrack> = {}): SdkTrack =>
  ({
    id: Id.parse(1),
    userId: Id.parse(1),
    user: makeSdkUser(1),
    title: 'Test Track',
    genre: Genre.Electronic,
    remixOf: { tracks: [] },
    fieldVisibility: {
      mood: true,
      tags: true,
      genre: true,
      share: true,
      playCount: true,
      remixes: true
    },
    trackSegments: [],
    followeeFavorites: [],
    followeeReposts: [],
    favoriteCount: 0,
    ...overrides
  }) as SdkTrack

describe('getTrackCollaboratorsForEdit', () => {
  it('includes accepted collaborators and pending invites', () => {
    const accepted = makeUserMetadata(2)
    const pending = makeUserMetadata(3)

    expect(
      getTrackCollaboratorsForEdit({
        collaborators: [accepted],
        pending_collaborators: [pending]
      })
    ).toEqual([accepted, pending])
  })

  it('deduplicates collaborators and excludes the owner', () => {
    const accepted = makeUserMetadata(2)
    const duplicateAccepted = makeUserMetadata(2)
    const pending = makeUserMetadata(3)
    const owner = makeUserMetadata(1)

    expect(
      getTrackCollaboratorsForEdit({
        owner_id: 1,
        collaborators: [accepted, duplicateAccepted, owner],
        pending_collaborators: [pending, accepted]
      })
    ).toEqual([accepted, pending])
  })
})

describe('userTrackMetadataFromSDK', () => {
  it('adapts accepted collaborators and pending collaborators separately', () => {
    const result = userTrackMetadataFromSDK(
      makeSdkTrack({
        collaborators: [makeSdkUser(2)],
        pendingCollaborators: [makeSdkUser(3)]
      })
    )

    expect(result?.collaborators?.map((user) => user.user_id)).toEqual([2])
    expect(result?.pending_collaborators?.map((user) => user.user_id)).toEqual([
      3
    ])
  })
})

describe('trackMetadataForUploadToSdk', () => {
  it('forwards allowed_api_keys as allowedApiKeys', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({ allowed_api_keys: ['some-api-key'] })
    )

    expect(result.allowedApiKeys).toEqual(['some-api-key'])
  })

  it('forwards null allowed_api_keys', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({ allowed_api_keys: null })
    )

    expect(result.allowedApiKeys).toBeNull()
  })

  it('passes a freeform/custom genre through to the SDK unchanged', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({ genre: 'Ambient Drone' })
    )

    expect(result.genre).toBe('Ambient Drone')
  })

  it('preserves a canonical genre', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({ genre: Genre.HipHopRap })
    )

    expect(result.genre).toBe(Genre.HipHopRap)
  })

  it('falls back to Electronic only when genre is empty', () => {
    const result = trackMetadataForUploadToSdk(makeMetadata({ genre: '' }))

    expect(result.genre).toBe(Genre.Electronic)
  })

  it('maps selected collaborator users to user ids', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({
        collaborators: [makeUserMetadata(2), makeUserMetadata(3)]
      })
    )

    expect(result).toMatchObject({ collaborators: [2, 3] })
  })

  it('deduplicates collaborator user ids before upload', () => {
    const result = trackMetadataForUploadToSdk(
      makeMetadata({
        owner_id: 1,
        collaborators: [
          makeUserMetadata(2),
          makeUserMetadata(2),
          makeUserMetadata(1),
          makeUserMetadata(3)
        ]
      })
    )

    expect(result).toMatchObject({ collaborators: [2, 3] })
  })
})
