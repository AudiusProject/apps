import { ClaimableTokensProgram, Secp256k1Program } from '@audius/spl'
import { AuthorityType } from '@solana/spl-token'
import { Keypair } from '@solana/web3.js'
import { describe, it, expect, vi } from 'vitest'

import { createAppWalletClient } from '../../../AudiusWalletClient'
import type { SolanaClient } from '../SolanaClient'

import { ClaimableTokensClient } from './ClaimableTokensClient'

const audiusWalletClient = createAppWalletClient({
  apiKey: '',
  apiSecret:
    '0x4ac8b3eff248bfbf20b324b575c1b333d42c6db3dbe19fd587c3d1e11323a25a'
})

const blockhash = Keypair.generate().publicKey.toBase58()
const feePayer = Keypair.generate().publicKey

const createClient = ({ exists }: { exists: boolean }) =>
  new ClaimableTokensClient({
    audiusWalletClient,
    solanaClient: {
      connection: {
        getAccountInfo: vi.fn(async () => (exists ? {} : null)),
        getLatestBlockhash: vi.fn(async () => ({
          blockhash,
          lastValidBlockHeight: 0
        }))
      },
      getFeePayer: vi.fn(async () => feePayer)
    } as unknown as SolanaClient
  })

describe('ClaimableTokensClient', () => {
  describe('createUserBankIfNeededInstruction', () => {
    it('sets the close authority to the rent destination', async () => {
      const client = createClient({ exists: false })
      const [ethWallet] = await audiusWalletClient.getAddresses()

      const { userBank, instructions } =
        await client.createUserBankIfNeededInstruction({
          ethWallet,
          mint: 'wAUDIO',
          instructionIndex: 2
        })

      expect(instructions).toHaveLength(3)
      const [create, secp, setAuthority] = instructions

      const decodedCreate = ClaimableTokensProgram.decodeInstruction(create!)
      expect(ClaimableTokensProgram.isCreateAccountInstruction(decodedCreate))
      expect(decodedCreate.keys.authority.pubkey).toBeDefined()

      // Secp256k1 instruction follows the create at index 3
      const decodedSecp = Secp256k1Program.decode(secp!)
      expect(Secp256k1Program.verifySignature(decodedSecp)).toBe(true)
      expect(decodedSecp.messageInstructionIndex).toBe(3)
      expect(decodedSecp.signatureInstructionIndex).toBe(3)
      expect(decodedSecp.ethAddressInstructionIndex).toBe(3)
      expect('0x' + Buffer.from(decodedSecp.ethAddress).toString('hex')).toBe(
        ethWallet!.toLowerCase()
      )

      const signed = ClaimableTokensProgram.decodeSignedSetAuthorityData(
        decodedSecp.message
      )
      expect(signed.blockhash).toBe(blockhash)
      expect(signed.userBank.equals(userBank)).toBe(true)
      expect(signed.authorityType).toBe(AuthorityType.CloseAccount)
      expect(
        signed.newAuthority?.equals(ClaimableTokensProgram.rentDestination)
      ).toBe(true)

      const decodedSetAuthority = ClaimableTokensProgram.decodeInstruction(
        setAuthority!
      )
      expect(
        ClaimableTokensProgram.isSetAuthorityInstruction(decodedSetAuthority)
      ).toBe(true)
      if (
        ClaimableTokensProgram.isSetAuthorityInstruction(decodedSetAuthority)
      ) {
        expect(decodedSetAuthority.keys.userBank.pubkey.equals(userBank)).toBe(
          true
        )
      }
    })

    it('returns no instructions when the user bank exists', async () => {
      const client = createClient({ exists: true })
      const { instructions } = await client.createUserBankIfNeededInstruction({
        ethWallet: '0xe42b199d864489387bf64262874fc6472bcbc151',
        mint: 'wAUDIO'
      })
      expect(instructions).toEqual([])
    })

    it('throws when creating a user bank for another wallet', async () => {
      const client = createClient({ exists: false })
      await expect(
        client.createUserBankIfNeededInstruction({
          ethWallet: '0xe42b199d864489387bf64262874fc6472bcbc151',
          mint: 'wAUDIO'
        })
      ).rejects.toThrow('Cannot set the close authority')
    })
  })
})
