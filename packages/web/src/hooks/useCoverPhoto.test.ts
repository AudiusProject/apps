import { describe, expect, it } from 'vitest'

import { shouldUseProfilePictureAsCoverPhoto } from './useCoverPhotoUtils'

describe('shouldUseProfilePictureAsCoverPhoto', () => {
  const defaultProfilePicture = 'default-profile-picture.jpg'
  const profilePicture = 'profile-picture.jpg'

  it('uses the profile picture fallback when the user has no cover photo', () => {
    expect(
      shouldUseProfilePictureAsCoverPhoto({
        coverPhoto: {},
        profilePicture,
        defaultProfilePicture
      })
    ).toBe(true)
  })

  it('ignores cover photo mirrors when checking for an actual cover photo', () => {
    expect(
      shouldUseProfilePictureAsCoverPhoto({
        coverPhoto: { mirrors: ['https://creatornode.audius.co'] },
        profilePicture,
        defaultProfilePicture
      })
    ).toBe(true)
  })

  it('does not use the profile picture fallback when a cover photo exists', () => {
    expect(
      shouldUseProfilePictureAsCoverPhoto({
        coverPhoto: { '640x': 'cover-photo.jpg' },
        profilePicture,
        defaultProfilePicture
      })
    ).toBe(false)
  })

  it('does not use the default profile picture as a cover fallback', () => {
    expect(
      shouldUseProfilePictureAsCoverPhoto({
        coverPhoto: {},
        profilePicture: defaultProfilePicture,
        defaultProfilePicture
      })
    ).toBe(false)
  })
})
