type CoverPhotoArtwork = Record<string, string | string[] | undefined>

export const hasCoverPhotoImage = (coverPhoto?: CoverPhotoArtwork) =>
  !!coverPhoto &&
  Object.entries(coverPhoto).some(
    ([key, value]) => key !== 'mirrors' && typeof value === 'string' && !!value
  )

export const shouldUseProfilePictureAsCoverPhoto = ({
  coverPhoto,
  profilePicture,
  defaultProfilePicture
}: {
  coverPhoto?: CoverPhotoArtwork
  profilePicture?: string
  defaultProfilePicture: string
}) =>
  !hasCoverPhotoImage(coverPhoto) &&
  !!profilePicture &&
  profilePicture !== defaultProfilePicture
