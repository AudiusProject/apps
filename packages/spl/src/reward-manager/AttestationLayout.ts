import { Layout, blob, utf8 } from '@solana/buffer-layout'
import { u64 } from '@solana/buffer-layout-utils'

import { ethAddress } from '../layout-utils'

import { Attestation } from './types'

export class AttestationLayout extends Layout<Attestation> {
  constructor(property?: string) {
    super(83, property)
  }

  getSpan(b: Uint8Array, offset = 0) {
    return this.span
  }

  decode(b: Uint8Array, offset = 0): Attestation {
    const delimiter = Buffer.from('_', 'utf-8')
    const recipientEthAddress = ethAddress().decode(b, offset)
    offset += ethAddress().span + 1
    const amount = u64().decode(b, offset)
    offset += u64().span + 1
    const delimiterIndex = b
      .slice(offset)
      .findIndex((v) => v === delimiter[0] || v === 0)
    const disbursementSpan =
      delimiterIndex > -1 ? delimiterIndex : b.byteLength - offset
    const disbursementIdBlob = blob(disbursementSpan).decode(b, offset)
    const disbursementId = Buffer.from(disbursementIdBlob).toString('utf-8')
    offset += disbursementSpan + 1
    return {
      recipientEthAddress,
      amount,
      disbursementId,
      antiAbuseOracleEthAddress:
        offset < b.byteLength ? ethAddress().decode(b, offset) : null
    }
  }

  encode(src: Attestation, b: Uint8Array, offset = 0) {
    const delimiter = Buffer.from('_', 'utf-8')
    let layoutOffset = offset
    layoutOffset += ethAddress().encode(
      src.recipientEthAddress,
      b,
      layoutOffset
    )
    layoutOffset += blob(1).encode(delimiter, b, layoutOffset)
    layoutOffset += u64().encode(src.amount, b, layoutOffset)
    layoutOffset += blob(1).encode(delimiter, b, layoutOffset)
    layoutOffset += utf8(32).encode(src.disbursementId, b, layoutOffset)

    if (src.antiAbuseOracleEthAddress) {
      layoutOffset += blob(1).encode(delimiter, b, layoutOffset)
      layoutOffset += ethAddress().encode(
        src.antiAbuseOracleEthAddress,
        b,
        layoutOffset
      )
    }
    return layoutOffset - offset
  }
}

export const attestationLayout = (property?: string) =>
  new AttestationLayout(property)
