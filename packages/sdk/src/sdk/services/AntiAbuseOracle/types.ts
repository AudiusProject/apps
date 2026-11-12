import { z } from 'zod'

import { ChallengeId } from '../../api/challenges/types'
import { AntiAbuseOracleSelectorService } from '../AntiAbuseOracleSelector'

export const GetAttestationSchema = z.object({
  /** The user's handle. */
  handle: z.string(),
  /** The challenge identifier. As in, the challenge "name." */
  challengeId: z.nativeEnum(ChallengeId),
  /** Identifier for the completed challenge instance. */
  specifier: z.string(),
  /** The amount being claimed, in decimal wAUDIO. */
  amount: z.number()
})

export type AttestationRequest = z.input<typeof GetAttestationSchema>

export type AttestationResponse = {
  /** The signature attesting the challenge disbursement request is allowed by AAO, or false. */
  result: string | false
  /** The error code of the failed attestation, if applicable. */
  errorCode?: number
}

export type AntiAbuseOracleHealthCheckResponse = {
  /** The version number of AAO deployed. */
  version: number
  /** The validator node endpoint the AAO is using. */
  selectedDiscoveryNode: string
  /** A list of other AAO endpoints. (note: Empty at time of writing!) */
  otherAntiAbuseOracleEndpoints: string[]
  /** The wallet public key address for this AAO. */
  walletPubkey: string
  /** The wallet public key address for this AAO from a validator node plugin. */
  antiAbuseWalletPubkey?: string
  /** Whether the database container is healthy (UP) or unhealthy (DOWN). */
  db: 'UP' | 'DOWN'
  /** The date of the last successful attestation. */
  lastSuccessfulAttestation: string
  /** The date of the last failed attestation. */
  lastfailedAttestation: string
}

/**
 * API Client for the Anti Abuse Oracle Service.
 */
export type AntiAbuseOracleService = {
  /**
   * Gets an attestation from Anti Abuse Oracle that the given user is
   * not marked as abusive by our anti abuse mechanisms for the purpose of
   * claiming a reward for completing a challenge.
   */
  getChallengeAttestation: (
    args: AttestationRequest
  ) => Promise<AttestationResponse>
  /**
   * Gets the wallet address of the current selected node.
   */
  getWalletAddress: () => Promise<string>
}

export type AntiAbuseOracleConfig = {
  antiAbuseOracleSelector: AntiAbuseOracleSelectorService
}
