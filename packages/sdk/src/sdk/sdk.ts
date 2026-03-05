import { createSdkWithServices } from './createSdkWithServices'
import { createSdkWithoutServices } from './createSdkWithoutServices'
import {
  SdkConfig,
  SdkConfigSchema,
  type SdkWithApiKeyOnlyConfig,
  type SdkWithApiSecretConfig,
  type SdkWithBearerTokenConfig,
  type SdkWithAppNameOnlyConfig,
  DevAppSchemaWithApiSecret,
  DevAppSchemaWithApiKeyOnly,
  DevAppSchemaWithAppNameOnly,
  DevAppSchemaWithBearerToken
} from './types'

const createSdkWithBearerToken = (config: SdkWithBearerTokenConfig) => {
  DevAppSchemaWithBearerToken.parse(config)
  return createSdkWithoutServices(config)
}

const createSdkWithApiName = (config: SdkWithAppNameOnlyConfig) => {
  DevAppSchemaWithAppNameOnly.parse(config)
  return createSdkWithServices(config)
}

const createSdkWithApiKey = (config: SdkWithApiKeyOnlyConfig) => {
  DevAppSchemaWithApiKeyOnly.parse(config)
  return createSdkWithServices(config)
}

const createSdkWithApiSecret = (config: SdkWithApiSecretConfig) => {
  DevAppSchemaWithApiSecret.parse(config)
  return createSdkWithServices(config)
}

/**
 * The Audius SDK
 */
export function sdk(
  config: SdkWithBearerTokenConfig
): ReturnType<typeof createSdkWithBearerToken>
export function sdk(
  config: SdkWithApiSecretConfig
): ReturnType<typeof createSdkWithApiSecret>
export function sdk(
  config: SdkWithApiKeyOnlyConfig
): ReturnType<typeof createSdkWithApiKey>
export function sdk(
  config: SdkWithAppNameOnlyConfig
): ReturnType<typeof createSdkWithApiName>
export function sdk(config: SdkConfig) {
  SdkConfigSchema.parse(config)

  if ('bearerToken' in config) {
    return createSdkWithBearerToken(config)
  }
  if ('apiSecret' in config) {
    return createSdkWithApiSecret(config)
  }
  if ('apiKey' in config) {
    return createSdkWithApiKey(config)
  }

  return createSdkWithApiName(config)
}

export type AudiusSdk = ReturnType<typeof sdk>
