import type { CoverArt, CoverPhoto, ProfilePicture } from '@audius/sdk/services'

import {
  CoverArtSizesCids,
  CoverPhotoSizesCids,
  ProfilePictureSizesCids,
  SquareSizes,
  WidthSizes
} from '~/models/ImageSizes'

export const coverPhotoSizesCIDsFromSDK = (
  input: CoverPhoto
): CoverPhotoSizesCids => {
  return [WidthSizes.SIZE_640, WidthSizes.SIZE_2000].reduce((out, size) => {
    out[size] = input[size] ?? null
    return out
  }, {})
}

export const coverArtSizesCIDsFromSDK = (
  input: CoverArt
): CoverArtSizesCids => {
  return [
    SquareSizes.SIZE_1000_BY_1000,
    SquareSizes.SIZE_150_BY_150,
    SquareSizes.SIZE_480_BY_480
  ].reduce((out, size) => {
    out[size] = input[size] ?? null
    return out
  }, {})
}

export const profilePictureSizesCIDsFromSDK = (
  input: ProfilePicture
): ProfilePictureSizesCids => {
  return [
    SquareSizes.SIZE_1000_BY_1000,
    SquareSizes.SIZE_150_BY_150,
    SquareSizes.SIZE_480_BY_480
  ].reduce((out, size) => {
    out[size] = input[size] ?? null
    return out
  }, {})
}
