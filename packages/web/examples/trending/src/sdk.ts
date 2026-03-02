import type { AudiusSdk } from '@audius/sdk'
import { sdk } from '@audius/sdk'

let sdkInstance: AudiusSdk | null = null

/**
 * Get or create the singleton SDK instance.
 *
 * Uses default production discovery/identity endpoints. Same pattern as the
 * mobile trending example (packages/mobile/examples/trending).
 */
export function getSDK(): AudiusSdk {
  if (!sdkInstance) {
    sdkInstance = sdk({
      appName: 'AudiusWebExample'
    })
  }
  return sdkInstance
}
