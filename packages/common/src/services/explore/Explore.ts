import { AudiusSdk, OptionalId } from '@audius/sdk'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'

import { ID } from '../../models'
import { AudiusBackend } from '../audius-backend'

type ExploreConfig = {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdk>
}

export class Explore {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdk>

  constructor(config: ExploreConfig) {
    this.audiusBackendInstance = config.audiusBackendInstance
    this.audiusSdk = config.audiusSdk
  }

  async getFeelingLuckyTracks(userId: ID | null | undefined, limit = 25) {
    try {
      const sdk = await this.audiusSdk()
      const { data = [] } = await sdk.full.tracks.getFeelingLuckyTracks({
        limit,
        withUsers: true,
        userId: OptionalId.parse(userId)
      })
      return transformAndCleanList(data, userTrackMetadataFromSDK)
    } catch (e) {
      console.error(e)
      return []
    }
  }
}
