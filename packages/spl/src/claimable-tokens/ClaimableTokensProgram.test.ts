import { AuthorityType } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'
import { describe, it, expect } from 'vitest'

import { Secp256k1Program } from '../secp256k1/Secp256k1Program'

import { ClaimableTokensProgram } from './ClaimableTokensProgram'
import { ClaimableTokensInstruction } from './constants'

// Secp256k1 instruction preceding a mainnet SetAuthority instruction that
// transferred ownership of user bank Bwde2Eu9... to 7gbjjeaa...
// Transaction: 5P5QZjQhzhik7b4YGVmkBpiTRXzKKMqApL86bEjYXMjq8LJkvQkRJzbCyy5yTw7oJjqgcUQoExawXLMUpANuNyts
const MAINNET_SET_AUTHORITY_SECP_DATA =
  'ASAAAAwAAGEAZwAAqa3Sldm1AP3Y5pW+XrSKsPWTSCY10DPjmy9H41ybWn1qnOD228tHJKP+2HVAoPYR/cp2NzDisog8Dhz+WpNrj1uvhx0FxK6CFpFnb9JZDCvQvdznAZ5oFp2hVwxgLEHrv0cngiL0NOpUdI/Qgk9bYH/htvWJIwAAAAYCAWNLDNbw11p9JYiGsQAm7ZmCOYs7zB0BRLQWG/CxkJOkopOo9nn6aEg4D4369kn7ivc9gOWiruJ81acljr1S/yQ='

describe('ClaimableTokensProgram', () => {
  describe('SetAuthority', () => {
    it('decodes the signed data of a mainnet SetAuthority', () => {
      const secp = Secp256k1Program.decode(
        Buffer.from(MAINNET_SET_AUTHORITY_SECP_DATA, 'base64')
      )
      expect(Secp256k1Program.verifySignature(secp)).toBe(true)

      const signed = ClaimableTokensProgram.decodeSignedSetAuthorityData(
        secp.message
      )
      expect(signed.userBank.toBase58()).toBe(
        'Bwde2Eu9FQMuV9RTwNj2vng8u92aRV1rjXzMyQJu83Ph'
      )
      expect(signed.authorityType).toBe(AuthorityType.AccountOwner)
      expect(signed.newAuthority?.toBase58()).toBe(
        '7gbjjeaajXHbgN5dH3gkJgZED2H5Sp5ANWE6K8L6R5Fy'
      )

      // Re-encoding produces the exact bytes that were signed
      expect(
        ClaimableTokensProgram.createSignedSetAuthorityData(signed).equals(
          Buffer.from(secp.message)
        )
      ).toBe(true)
    })

    it('round trips close authority signed data', () => {
      const userBank = Keypair.generate().publicKey
      const data = ClaimableTokensProgram.createSignedSetAuthorityData({
        blockhash: Keypair.generate().publicKey.toBase58(),
        userBank,
        authorityType: AuthorityType.CloseAccount,
        newAuthority: ClaimableTokensProgram.rentDestination
      })
      const decoded = ClaimableTokensProgram.decodeSignedSetAuthorityData(data)
      expect(decoded.userBank.equals(userBank)).toBe(true)
      expect(decoded.authorityType).toBe(AuthorityType.CloseAccount)
      expect(
        decoded.newAuthority?.equals(ClaimableTokensProgram.rentDestination)
      ).toBe(true)
    })

    it('rejects signed data with trailing bytes', () => {
      const data = ClaimableTokensProgram.createSignedSetAuthorityData({
        blockhash: Keypair.generate().publicKey.toBase58(),
        userBank: Keypair.generate().publicKey,
        authorityType: AuthorityType.CloseAccount,
        newAuthority: ClaimableTokensProgram.rentDestination
      })
      expect(() =>
        ClaimableTokensProgram.decodeSignedSetAuthorityData(
          Buffer.concat([data, Buffer.from([0])])
        )
      ).toThrow()
    })

    it('encodes and decodes the SetAuthority instruction', () => {
      const userBank = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const instruction = ClaimableTokensProgram.createSetAuthorityInstruction({
        userBank,
        authority
      })
      expect(instruction.data).toEqual(Buffer.from([2]))
      const decoded = ClaimableTokensProgram.decodeInstruction(instruction)
      expect(ClaimableTokensProgram.isSetAuthorityInstruction(decoded)).toBe(
        true
      )
      if (ClaimableTokensProgram.isSetAuthorityInstruction(decoded)) {
        expect(decoded.keys.userBank.pubkey.equals(userBank)).toBe(true)
        expect(decoded.keys.authority.pubkey.equals(authority)).toBe(true)
      }
    })
  })

  it('decodes the Close instruction', () => {
    const ethAddress = '0xe42b199d864489387bf64262874fc6472bcbc151'
    const data = Buffer.concat([
      Buffer.from([ClaimableTokensInstruction.Close]),
      Buffer.from(ethAddress.slice(2), 'hex')
    ])
    const keys = [0, 1, 2, 3].map(() => ({
      pubkey: Keypair.generate().publicKey,
      isSigner: false,
      isWritable: false
    }))
    const decoded = ClaimableTokensProgram.decodeInstruction({
      programId: ClaimableTokensProgram.programId,
      keys,
      data
    })
    expect(ClaimableTokensProgram.isCloseInstruction(decoded)).toBe(true)
    if (ClaimableTokensProgram.isCloseInstruction(decoded)) {
      expect(decoded.data.ethAddress).toBe(ethAddress)
      expect(decoded.keys.destination.pubkey.equals(keys[2]!.pubkey)).toBe(true)
    }
  })

  it('exposes the program rent destination', () => {
    expect(ClaimableTokensProgram.rentDestination).toEqual(
      new PublicKey('2HYDf9XvHRKhquxK1z4ETJ8ywueZcqEazyFZdRfLqGcT')
    )
  })
})
