import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

let sdkInstance: AudiusSdk | null = null

/**
 * Get or create the singleton SDK instance.
 *
 * Uses default production discovery/identity endpoints. This is the same pattern
 * used in mobile-devkit (template-expo, examples-expo). For custom endpoints you
 * can pass services in the config (see SDK types).
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk({
      appName: 'AudiusMobileExample'
    })
  }
  return sdkInstance
}
