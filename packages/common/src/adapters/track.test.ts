import { Genre } from '@audius/sdk'
import { describe, expect, it } from 'vitest'

import type { TrackMetadataForUpload } from '~/store/upload/types'

import { trackMetadataForUploadToSdk } from './track'

const makeMetadata = (
  overrides: Partial<TrackMetadataForUpload> = {}
): TrackMetadataForUpload =>
  ({
    title: 'Test Track',
    genre: Genre.Electronic,
    ...overrides
  }) as TrackMetadataForUpload

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
})
