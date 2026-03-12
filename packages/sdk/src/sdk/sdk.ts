import { createSdk } from './createSdk'

/**
 * The Audius SDK
 */
export const sdk = createSdk

export type AudiusSdk = ReturnType<typeof sdk>
