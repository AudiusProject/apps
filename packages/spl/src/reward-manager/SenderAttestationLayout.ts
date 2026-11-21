import { blob, Layout } from '@solana/buffer-layout'
import { publicKey } from '@solana/buffer-layout-utils'

import { ethAddress } from '../layout-utils'

import type { SenderAttestation } from './types'

const encoder = new TextEncoder()
const SENDER_ATTESTATION_PREFIX = 'add'
const SENDER_ATTESTATION_PREFIX_BYTES = encoder.encode(
  SENDER_ATTESTATION_PREFIX
)

export class SenderAttestationLayout extends Layout<SenderAttestation> {
  constructor(property?: string) {
    super(55, property)
  }

  decode(b: Uint8Array, offset?: number): SenderAttestation {
    throw new Error('Method not implemented.')
  }

  encode(src: SenderAttestation, b: Uint8Array, offset = 0): number {
    offset += blob(3).encode(SENDER_ATTESTATION_PREFIX_BYTES, b, offset)
    offset += publicKey().encode(src.rewardManagerState, b, offset)
    offset += ethAddress().encode(src.senderEthAddress, b, offset)
    return offset
  }
}

export const senderAttestationLayout = (property?: string) =>
  new SenderAttestationLayout(property)
