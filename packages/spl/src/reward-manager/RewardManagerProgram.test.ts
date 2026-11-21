import { PublicKey } from '@solana/web3.js'
import { describe, it, expect } from 'vitest'

import { RewardManagerProgram } from './RewardManagerProgram'

describe('RewardManagerProgram', () => {
  it('encodes the Discovery attestation instruction data correctly', () => {
    const args = {
      disbursementId: 'track-upload:1',
      recipientEthAddress: '0x055FA758c77D68a04990E992aA4dcdeF899F654A',
      antiAbuseOracleEthAddress: '0xF0D5BC18421fa04D0a2A2ef540ba5A9f04014BE3',
      amount: BigInt(123)
    }
    const data = RewardManagerProgram.encodeAttestation(args)
    expect(data.subarray(0, 20).toString('hex')).toBe(
      args.recipientEthAddress.substring(2).toLowerCase()
    )
    expect(data.subarray(20, 21).toString('utf-8')).toBe('_')
    expect(data.subarray(21, 29).readBigInt64LE()).toBe(args.amount)
    expect(data.subarray(29, 30).toString('utf-8')).toBe('_')
    expect(data.subarray(30, 44).toString('utf-8')).toBe(args.disbursementId)
    expect(data.subarray(44, 45).toString('utf-8')).toBe('_')
    expect(data.subarray(45, 65).toString('hex')).toBe(
      args.antiAbuseOracleEthAddress.substring(2).toLowerCase()
    )
  })

  it('decodes the Discovery attestation instruction data correctly', () => {
    const args = {
      disbursementId: 'track-upload:1',
      recipientEthAddress: '0x055FA758c77D68a04990E992aA4dcdeF899F654A',
      antiAbuseOracleEthAddress: '0xF0D5BC18421fa04D0a2A2ef540ba5A9f04014BE3',
      amount: BigInt(123)
    }
    const data = Buffer.from([
      5, 95, 167, 88, 199, 125, 104, 160, 73, 144, 233, 146, 170, 77, 205, 239,
      137, 159, 101, 74, 95, 123, 0, 0, 0, 0, 0, 0, 0, 95, 116, 114, 97, 99,
      107, 45, 117, 112, 108, 111, 97, 100, 58, 49, 95, 240, 213, 188, 24, 66,
      31, 160, 77, 10, 42, 46, 245, 64, 186, 90, 159, 4, 1, 75, 227
    ])
    const attestation = RewardManagerProgram.decodeAttestation(data)
    expect(attestation.recipientEthAddress).toBe(
      args.recipientEthAddress.toLowerCase()
    )
    expect(attestation.amount).toBe(args.amount)
    expect(attestation.disbursementId).toBe(args.disbursementId)
    expect(attestation.antiAbuseOracleEthAddress).toBe(
      args.antiAbuseOracleEthAddress.toLowerCase()
    )
  })

  it('encodes the AAO attestation instruction data correctly', () => {
    const args = {
      disbursementId: 'track-upload:1',
      recipientEthAddress: '0x055FA758c77D68a04990E992aA4dcdeF899F654A',
      amount: BigInt(123)
    }
    const data = RewardManagerProgram.encodeAttestation(args)
    expect(data.subarray(0, 20).toString('hex')).toBe(
      args.recipientEthAddress.substring(2).toLowerCase()
    )
    expect(data.subarray(20, 21).toString('utf-8')).toBe('_')
    expect(data.subarray(21, 29).readBigInt64LE()).toBe(args.amount)
    expect(data.subarray(29, 30).toString('utf-8')).toBe('_')
    expect(data.subarray(30, 44).toString('utf-8')).toBe(args.disbursementId)
  })

  it('decodes the AAO attestation instruction data correctly', () => {
    const args = {
      disbursementId: 'track-upload:1',
      recipientEthAddress: '0x055FA758c77D68a04990E992aA4dcdeF899F654A',
      amount: BigInt(123)
    }
    const data = Buffer.from([
      5, 95, 167, 88, 199, 125, 104, 160, 73, 144, 233, 146, 170, 77, 205, 239,
      137, 159, 101, 74, 95, 123, 0, 0, 0, 0, 0, 0, 0, 95, 116, 114, 97, 99,
      107, 45, 117, 112, 108, 111, 97, 100, 58, 49
    ])
    const attestation = RewardManagerProgram.decodeAttestation(data)
    expect(attestation.recipientEthAddress).toBe(
      args.recipientEthAddress.toLowerCase()
    )
    expect(attestation.amount).toBe(args.amount)
    expect(attestation.disbursementId).toBe(args.disbursementId)
    expect(attestation.antiAbuseOracleEthAddress).toBe(null)
  })

  it('decodes the account data of a single attestation', () => {
    const data = Buffer.from([
      1, 182, 193, 28, 253, 102, 169, 6, 208, 160, 135, 219, 13, 183, 183, 115,
      130, 16, 205, 49, 82, 187, 88, 76, 117, 96, 175, 210, 205, 23, 16, 17, 91,
      1, 240, 213, 188, 24, 66, 31, 160, 77, 10, 42, 46, 245, 64, 186, 90, 159,
      4, 1, 75, 227, 52, 1, 125, 122, 189, 249, 224, 203, 195, 55, 152, 10, 225,
      118, 62, 10, 73, 119, 125, 247, 95, 0, 225, 245, 5, 0, 0, 0, 0, 95, 116,
      114, 97, 99, 107, 45, 117, 112, 108, 111, 97, 100, 58, 52, 56, 51, 49, 49,
      55, 52, 51, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 133, 95, 167, 88, 199, 125, 104, 160, 73, 144, 233,
      146, 170, 77, 205, 239, 137, 159, 101, 74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ])
    const decoded = RewardManagerProgram.decodeAttestationsAccountData(4, data)
    expect(decoded.messages[0].attestation.recipientEthAddress).toBe(
      '0x34017d7abdf9e0cbc337980ae1763e0a49777df7'
    )
    expect(decoded.messages[0].attestation.amount).toBe(BigInt(100000000))
    expect(decoded.messages[0].attestation.disbursementId).toBe(
      'track-upload:483117431'
    )
    expect(decoded.messages[0].attestation.antiAbuseOracleEthAddress).toBe(null)
    expect(decoded.messages.length === 1)
  })

  it('decodes the account data of three attestations', () => {
    const data = Buffer.from([
      1, 89, 83, 235, 128, 55, 250, 76, 101, 233, 208, 198, 87, 196, 72, 83,
      209, 60, 0, 168, 125, 185, 129, 114, 121, 85, 236, 215, 187, 200, 142,
      245, 203, 3, 242, 137, 121, 147, 149, 29, 83, 167, 227, 235, 34, 66, 214,
      161, 77, 32, 40, 20, 13, 200, 38, 3, 48, 178, 184, 224, 69, 105, 57, 71,
      185, 90, 101, 197, 87, 24, 61, 0, 57, 125, 95, 0, 225, 245, 5, 0, 0, 0, 0,
      95, 98, 58, 49, 48, 54, 56, 55, 57, 61, 62, 49, 48, 48, 52, 54, 53, 48,
      52, 49, 55, 95, 152, 17, 186, 62, 171, 31, 44, 217, 162, 223, 237, 177,
      158, 140, 42, 105, 114, 157, 200, 182, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 229, 178, 86,
      211, 2, 234, 47, 78, 4, 184, 243, 191, 216, 105, 90, 222, 20, 122, 182,
      141, 152, 17, 186, 62, 171, 31, 44, 217, 162, 223, 237, 177, 158, 140, 42,
      105, 114, 157, 200, 182, 38, 3, 48, 178, 184, 224, 69, 105, 57, 71, 185,
      90, 101, 197, 87, 24, 61, 0, 57, 125, 95, 0, 225, 245, 5, 0, 0, 0, 0, 95,
      98, 58, 49, 48, 54, 56, 55, 57, 61, 62, 49, 48, 48, 52, 54, 53, 48, 52,
      49, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 152, 17, 186, 62, 171, 31, 44, 217, 162, 223, 237, 177,
      158, 140, 42, 105, 114, 157, 200, 182, 44, 214, 106, 57, 49, 195, 101,
      150, 239, 176, 55, 176, 103, 83, 71, 109, 206, 107, 78, 134, 38, 3, 48,
      178, 184, 224, 69, 105, 57, 71, 185, 90, 101, 197, 87, 24, 61, 0, 57, 125,
      95, 0, 225, 245, 5, 0, 0, 0, 0, 95, 98, 58, 49, 48, 54, 56, 55, 57, 61,
      62, 49, 48, 48, 52, 54, 53, 48, 52, 49, 55, 95, 152, 17, 186, 62, 171, 31,
      44, 217, 162, 223, 237, 177, 158, 140, 42, 105, 114, 157, 200, 182, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 100, 112, 218, 243, 189, 50, 245, 1, 69, 18, 188, 223, 13,
      2, 35, 47, 86, 64, 165, 189, 152, 17, 186, 62, 171, 31, 44, 217, 162, 223,
      237, 177, 158, 140, 42, 105, 114, 157, 200, 182, 38, 3, 48, 178, 184, 224,
      69, 105, 57, 71, 185, 90, 101, 197, 87, 24, 61, 0, 57, 125, 95, 0, 225,
      245, 5, 0, 0, 0, 0, 95, 98, 58, 49, 48, 54, 56, 55, 57, 61, 62, 49, 48,
      48, 52, 54, 53, 48, 52, 49, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 152, 17, 186, 62, 171, 31, 44,
      217, 162, 223, 237, 177, 158, 140, 42, 105, 114, 157, 200, 182
    ])
    const decoded = RewardManagerProgram.decodeAttestationsAccountData(4, data)
    expect(decoded.version).toBe(1)
    expect(decoded.rewardManagerState.toBase58()).toBe(
      '71hWFVYokLaN1PNYzTAWi13EfJ7Xt9VbSWUKsXUT8mxE'
    )
    expect(decoded.count).toBe(3)

    expect(decoded.messages[0].senderEthAddress).toBe(
      '0xf2897993951d53a7e3eb2242d6a14d2028140dc8'
    )
    expect(decoded.messages[0].attestation.recipientEthAddress).toBe(
      '0x260330b2b8e045693947b95a65c557183d00397d'
    )
    expect(decoded.messages[0].attestation.amount).toBe(BigInt(100000000))
    expect(decoded.messages[0].attestation.disbursementId).toBe(
      'b:106879=>1004650417'
    )
    expect(decoded.messages[0].attestation.antiAbuseOracleEthAddress).toBe(
      '0x9811ba3eab1f2cd9a2dfedb19e8c2a69729dc8b6'
    )
    expect(decoded.messages[0].operator).toBe(
      '0xe5b256d302ea2f4e04b8f3bfd8695ade147ab68d'
    )

    expect(decoded.messages[1].senderEthAddress).toBe(
      '0x9811ba3eab1f2cd9a2dfedb19e8c2a69729dc8b6'
    )
    expect(decoded.messages[1].attestation.recipientEthAddress).toBe(
      '0x260330b2b8e045693947b95a65c557183d00397d'
    )
    expect(decoded.messages[1].attestation.amount).toBe(BigInt(100000000))
    expect(decoded.messages[1].attestation.disbursementId).toBe(
      'b:106879=>1004650417'
    )
    expect(decoded.messages[1].attestation.antiAbuseOracleEthAddress).toBe(null)
    expect(decoded.messages[1].operator).toBe(
      '0x9811ba3eab1f2cd9a2dfedb19e8c2a69729dc8b6'
    )

    expect(decoded.messages[2].senderEthAddress).toBe(
      '0x2cd66a3931c36596efb037b06753476dce6b4e86'
    )
    expect(decoded.messages[2].attestation.recipientEthAddress).toBe(
      '0x260330b2b8e045693947b95a65c557183d00397d'
    )
    expect(decoded.messages[2].attestation.amount).toBe(BigInt(100000000))
    expect(decoded.messages[2].attestation.disbursementId).toBe(
      'b:106879=>1004650417'
    )
    expect(decoded.messages[2].attestation.antiAbuseOracleEthAddress).toBe(
      '0x9811ba3eab1f2cd9a2dfedb19e8c2a69729dc8b6'
    )
    expect(decoded.messages[2].operator).toBe(
      '0x6470daf3bd32f5014512bcdf0d02232f5640a5bd'
    )
  })

  it('encodes the evaluate attestation instruction data', () => {
    const mockPubkey = new PublicKey(
      '7c7wdSMAvswavryV6d9knEskoptUx919F2bLFYPrffqQ'
    )
    const instruction =
      RewardManagerProgram.createEvaluateAttestationsInstruction({
        disbursementId: 'track-upload:483117431',
        recipientEthAddress: '0x34017d7abdf9e0cbc337980ae1763e0a49777df7',
        amount: BigInt('100000000'),

        rewardManagerState: mockPubkey,
        attestations: mockPubkey,
        antiAbuseOracle: mockPubkey,
        authority: mockPubkey,
        rewardManagerTokenSource: mockPubkey,
        destinationUserBank: mockPubkey,
        disbursementAccount: mockPubkey,
        payer: mockPubkey
      })
    expect(instruction.data.subarray(0, 1).readUint8()).toBe(7)
    expect(instruction.data.subarray(1, 9).readBigInt64LE()).toBe(
      BigInt('100000000')
    )
    expect(instruction.data.subarray(9).readUint16LE()).toBe(
      instruction.data.byteLength - 20 - 9 - 4
    )
    expect(
      instruction.data
        .subarray(13, instruction.data.byteLength - 20)
        .toString('utf-8')
    ).toBe('track-upload:483117431')
    expect(
      instruction.data
        .subarray(instruction.data.byteLength - 20)
        .toString('hex')
    ).toBe('34017d7abdf9e0cbc337980ae1763e0a49777df7')
    expect(instruction.data.byteLength).toBe(55)
  })
})
