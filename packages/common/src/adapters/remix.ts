import { full } from '@audius/sdk'
import snakecaseKeys from 'snakecase-keys'

import { Remix } from '~/models/Track'
import { decodeHashId } from '~/utils/hashIds'

import { userMetadataFromSDK } from './user'

export const remixFromSDK = (input: full.FullRemix): Remix | undefined => {
  const decodedTrackId = decodeHashId(input.parentTrackId)
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
