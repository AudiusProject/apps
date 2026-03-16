import { OptionalHashId, type Remix as SdkRemix } from '@audius/sdk/services'
import snakecaseKeys from 'snakecase-keys'

import { Remix } from '~/models/Track'

import { userMetadataFromSDK } from './user'

export const remixFromSDK = (input: SdkRemix): Remix | undefined => {
  const decodedTrackId = OptionalHashId.parse(input.parentTrackId)
  const user = userMetadataFromSDK(input.user)
  if (!decodedTrackId || !user) {
    return undefined
  }

  return {
    ...snakecaseKeys(input),
    parent_track_id: decodedTrackId,
    user
  }
}
