import { createSdkWithApiSecret } from './createSdkWithApiSecret'
import { createSdkWithBearerToken } from './createSdkWithBearerToken'
import {
  SdkConfig,
  SdkConfigSchema,
  type SdkWithApiKeyOnlyConfig,
  type SdkWithApiSecretConfig,
  type SdkWithBearerTokenConfig
} from './types'

/**
 * The Audius SDK
 */
export function sdk(
  config: SdkWithBearerTokenConfig
): ReturnType<typeof createSdkWithBearerToken>
export function sdk(
  config: SdkWithApiSecretConfig | SdkWithApiKeyOnlyConfig
): ReturnType<typeof createSdkWithApiSecret>
export function sdk(config: SdkConfig) {
  SdkConfigSchema.parse(config)

  if ('apiBearerToken' in config) {
    return createSdkWithBearerToken(config)
  }

  return createSdkWithApiSecret(config)
}

export type AudiusSdk = ReturnType<typeof sdk>
