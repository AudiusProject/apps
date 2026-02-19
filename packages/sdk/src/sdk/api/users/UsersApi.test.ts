import fs from 'fs'
import path from 'path'

import { ClaimableTokensProgram } from '@audius/spl'
import { DecodedTransferClaimableTokensInstruction } from '@audius/spl/dist/types/claimable-tokens/types'
import {
  PublicKey,
  Secp256k1Program,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import { beforeAll, describe, expect, it, vitest } from 'vitest'

import { developmentConfig } from '../../config/development'
import {
  ClaimableTokensClient,
  SolanaRelay,
  SolanaRelayWalletAdapter,
  createAppWalletClient,
  getDefaultClaimableTokensConfig,
  EmailEncryptionService
} from '../../services'
import { EntityManagerClient } from '../../services/EntityManager'
import { Logger } from '../../services/Logger'
import { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { Storage } from '../../services/Storage'
import { StorageNodeSelector } from '../../services/StorageNodeSelector'
import { getReaction } from '../../utils/reactionsMap'
import { Configuration } from '../generated/default'

import { UsersApi } from './UsersApi'

const pngFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/png-file.png')
)

vitest.mock('../../services/EntityManager')

vitest.spyOn(Storage.prototype, 'uploadFile').mockImplementation(() => ({
  start: async () => {
    return {
      id: 'a',
      status: 'done',
      results: {
        '320': 'a'
      },
      orig_file_cid:
        'baeaaaiqsea7fukrfrjrugqts6jqfmqhcb5ruc5pjmdk3anj7amoht4d4gemvq',
      orig_filename: 'file.wav',
      probe: {
        format: {
          duration: '10'
        }
      },
      audio_analysis_error_count: 0,
      audio_analysis_results: {}
    }
  },
  abort: () => {}
}))

vitest
  .spyOn(EntityManagerClient.prototype, 'manageEntity')
  .mockImplementation(async () => {
    return {
      blockHash: 'a',
      blockNumber: 1
    } as any
  })

let users: UsersApi

const audiusWalletClient = createAppWalletClient({ apiKey: '' })
const logger = new Logger()
const storageNodeSelector = new StorageNodeSelector({
  endpoint: 'https://discoveryprovider.audius.co',
  logger
})
const solanaRelay = new SolanaRelay()
const solanaClient = new SolanaClient({
  solanaWalletAdapter: new SolanaRelayWalletAdapter({ solanaRelay })
})
const claimableTokens = new ClaimableTokensClient({
  ...getDefaultClaimableTokensConfig(developmentConfig),
  audiusWalletClient,
  solanaClient
})

const emailEncryption = new EmailEncryptionService(
  new Configuration(),
  audiusWalletClient
)

describe('UsersApi', () => {
  beforeAll(() => {
    users = new UsersApi(
      new Configuration(),
      new Storage({
        storageNodeSelector,
        logger: new Logger()
      }),
      new EntityManagerClient({
        audiusWalletClient,
        endpoint: 'https://discoveryprovider.audius.co'
      }),
      new Logger(),
      claimableTokens,
      solanaClient,
      emailEncryption
    )
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('updateProfile', () => {
    it('updates the user profile if valid metadata is provided', async () => {
      const result = await users.updateProfile({
        userId: '7eP5n',
        profilePictureFile: {
          buffer: pngFile,
          name: 'profilePicture'
        },
        coverArtFile: {
          buffer: pngFile,
          name: 'coverArt'
        },
        metadata: {
          name: 'name',
          bio: 'bio',
          location: 'location',
          artistPickTrackId: '7eP5n',
          isDeactivated: false
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('updates the user profile if partial valid metadata is provided', async () => {
      const result = await users.updateProfile({
        userId: '7eP5n',
        metadata: {
          bio: 'The bio has been updated'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.updateProfile({
          userId: '7eP5n',
          metadata: {
            asdf: '123'
          } as any
        })
      }).rejects.toThrow()
    })

    it('throws an error if invalid request is sent', async () => {
      await expect(async () => {
        await users.updateProfile({
          metadata: { bio: 'New bio' }
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('followUser', () => {
    it('follows a user if valid metadata is provided', async () => {
      const result = await users.followUser({
        userId: '7eP5n',
        followeeUserId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.followUser({
          userId: '7eP5n',
          followeeUserId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unfollowUser', () => {
    it('unfollows a user if valid metadata is provided', async () => {
      const result = await users.unfollowUser({
        userId: '7eP5n',
        followeeUserId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.unfollowUser({
          userId: '7eP5n',
          followeeUserId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('subscribeToUser', () => {
    it('subscribes to a user if valid metadata is provided', async () => {
      const result = await users.subscribeToUser({
        userId: '7eP5n',
        subscribeeUserId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.subscribeToUser({
          userId: '7eP5n',
          subscribeeUserId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('unsubscribeFromUser', () => {
    it('unsubscribes from a user if valid metadata is provided', async () => {
      const result = await users.unsubscribeFromUser({
        userId: '7eP5n',
        subscribeeUserId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.unsubscribeFromUser({
          userId: '7eP5n',
          subscribeeUserId: 1 as any
        })
      }).rejects.toThrow()
    })
  })

  // TODO: PAY-2911
  describe.skip('sendTip', () => {
    it('creates and relays a tip transaction with properly formed instructions', async () => {
      const senderUserId = '7eP5n'
      const receiverUserId = 'ML51L'
      const amount = 1
      const outputAmount = BigInt(100000000) // wAUDIO has 8 decimals
      // Arbitrary
      const ethWallets: Record<string, string> = {
        [senderUserId]: '0x0000000000000000000000000000000000000001',
        [receiverUserId]: '0x0000000000000000000000000000000000000002'
      }
      // Arbitrary
      const feePayer = new PublicKey(
        'EAzM1rRJf31SVB4nDHqi2oBtLWUtyXfQSaiq6r2yt7BY'
      )
      // Derived from fake eth wallets
      const userBanks: Record<string, PublicKey> = {
        [senderUserId]: new PublicKey(
          '3rbiBEM3Qf9jyx64kZ8TDBwMSFPn4yv52eTNHLXMn5gs'
        ),
        [receiverUserId]: new PublicKey(
          'BTEiebv6WfDi4rxFhNNnbaRn8wKJ7a9eQArHmnAeUU7g'
        )
      }

      // Turn the relay call into a bunch of assertions on the final transaction
      vitest
        .spyOn(SolanaRelay.prototype, 'relay')
        .mockImplementation(async ({ transaction }) => {
          let instructions: TransactionInstruction[] = []
          if (transaction instanceof VersionedTransaction) {
            const message = TransactionMessage.decompile(transaction.message)
            instructions = message.instructions
          } else {
            instructions = transaction.instructions
          }
          const [secp, transfer] = instructions
          expect(secp?.programId.toBase58()).toBe(
            Secp256k1Program.programId.toBase58()
          )
          expect(transfer).toBeTruthy()
          const decoded = ClaimableTokensProgram.decodeInstruction(transfer!)
          expect(ClaimableTokensProgram.isTransferInstruction(decoded)).toBe(
            true
          )
          // Typescript hint - see above assert
          const decoded2 = decoded as DecodedTransferClaimableTokensInstruction

          expect(decoded2.keys.destination.pubkey.toBase58()).toBe(
            userBanks[receiverUserId]?.toBase58()
          )
          expect(decoded2.keys.sourceUserBank.pubkey.toBase58()).toBe(
            userBanks[senderUserId]?.toBase58()
          )
          const data =
            ClaimableTokensProgram.decodeSignedTransferInstructionData(secp!)

          expect(data.destination.toBase58()).toBe(
            userBanks[receiverUserId]?.toBase58()
          )
          expect(data.amount).toBe(outputAmount)

          return { signature: 'fake-sig' }
        })

      // Mock getFeePayer
      vitest
        .spyOn(SolanaRelay.prototype, 'getFeePayer')
        .mockImplementation(async () => {
          return feePayer
        })

      // Mock getWalletAndUserBank
      vitest
        // @ts-ignore
        .spyOn(UsersApi.prototype, 'getWalletAndUserBank')
        // @ts-ignore
        .mockImplementation(async (id) => {
          return {
            ethWallet: ethWallets[id],
            userBank: userBanks[id]
          }
        })

      // Mock sign
      vitest.spyOn(audiusWalletClient, 'sign').mockImplementation(async () => {
        return [Uint8Array.from(new Array(64).fill(0)), 0]
      })

      await users.sendTip({
        amount,
        senderUserId,
        receiverUserId
      })

      // Ensure relay was attempted to ensure the assertions run
      expect(solanaRelay.relay).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendTipReaction', () => {
    it('converts correct reaction values', () => {
      const heartEyes = getReaction(1)
      const fire = getReaction(2)
      const party = getReaction(3)
      const headExploding = getReaction(4)
      const invalidEmoji = getReaction(5)

      expect(heartEyes).toEqual('😍')
      expect(fire).toEqual('🔥')
      expect(party).toEqual('🥳')
      expect(headExploding).toEqual('🤯')
      expect(invalidEmoji).toBeUndefined()

      const one = getReaction('😍')
      const two = getReaction('🔥')
      const three = getReaction('🥳')
      const four = getReaction('🤯')
      // @ts-ignore because type checker only accepts previous four emojis
      const invalidNumber = getReaction('🦀')

      expect(one).toEqual(1)
      expect(two).toEqual(2)
      expect(three).toEqual(3)
      expect(four).toEqual(4)
      expect(invalidNumber).toBeUndefined()
    })

    it('creates and relays a properly formatted tip reaction', async () => {
      const result = await users.sendTipReaction({
        userId: '7eP5n',
        metadata: {
          reactedTo: 'userTip1',
          reactionValue: '🔥'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })
  })

  describe('shareEmail', () => {
    beforeAll(() => {
      vitest
        .spyOn(EmailEncryptionService.prototype, 'decryptSymmetricKey')
        .mockImplementation(async () => {
          return new Uint8Array(32)
        })

      vitest
        .spyOn(EmailEncryptionService.prototype, 'createSymmetricKey')
        .mockImplementation(() => {
          return new Uint8Array(32)
        })

      vitest
        .spyOn(EmailEncryptionService.prototype, 'encryptSymmetricKey')
        .mockImplementation(async () => {
          return 'mockEncryptedKey'
        })

      vitest
        .spyOn(EmailEncryptionService.prototype, 'encryptEmail')
        .mockImplementation(async () => {
          return 'mockEncryptedEmail'
        })

      vitest
        .spyOn(UsersApi.prototype, 'getUserEmailKey')
        .mockImplementation(async () => {
          return {
            data: {
              encryptedKey: 'mockEncryptedKey',
              isInitial: false,
              id: 1,
              emailOwnerUserId: 1,
              receivingUserId: 2,
              grantorUserId: 3,
              createdAt: '2025-01-01',
              updatedAt: '2025-01-01'
            }
          }
        })
    })

    it('adds an encrypted email if valid metadata is provided', async () => {
      const result = await users.shareEmail({
        emailOwnerUserId: 123,
        receivingUserId: 456,
        email: 'email@example.com',
        initialEmailEncryptionUuid: 1
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('adds an encrypted email without optional delegated fields', async () => {
      const result = await users.shareEmail({
        emailOwnerUserId: 123,
        receivingUserId: 456,
        email: 'email@example.com',
        initialEmailEncryptionUuid: 1
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if required fields are missing', async () => {
      await expect(async () => {
        await users.shareEmail({
          emailOwnerUserId: 123,
          // Missing receivingUserId
          encryptedEmail: 'encryptedEmailString',
          encryptedKey: 'encryptedKeyString'
        } as any)
      }).rejects.toThrow()
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.shareEmail({
          emailOwnerUserId: 123,
          // Incorrect type for receivingUserId
          receivingUserId: '456',
          encryptedEmail: 'encryptedEmailString',
          encryptedKey: 'encryptedKeyString'
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('addAssociatedWallet', () => {
    it('adds an associated ethereum wallet if valid metadata is provided', async () => {
      const result = await users.addAssociatedWallet({
        userId: '7eP5n',
        wallet: {
          address: '0x1234567890123456789012345678901234567890',
          chain: 'eth'
        },
        signature: '0xabcdef1234567890'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('adds an associated solana wallet if valid metadata is provided', async () => {
      const result = await users.addAssociatedWallet({
        userId: '7eP5n',
        wallet: {
          address: '5FHwkrdxkjgwwmeNq4Gu168KzTXdMxZY8wuTvqxDbB1E',
          chain: 'sol'
        },
        signature: 'mockSolanaSignature'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid ethereum address is provided', async () => {
      await expect(async () => {
        await users.addAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: '0xinvalid', // Invalid eth address
            chain: 'eth'
          },
          signature: '0xabcdef1234567890'
        })
      }).rejects.toThrow()
    })

    it('throws an error if invalid solana address is provided', async () => {
      await expect(async () => {
        await users.addAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: 'invalid', // Invalid sol address
            chain: 'sol'
          },
          signature: 'mockSolanaSignature'
        })
      }).rejects.toThrow()
    })

    it('throws an error if invalid chain is provided', async () => {
      await expect(async () => {
        await users.addAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: '0x1234567890123456789012345678901234567890',
            chain: 'invalid' as any
          },
          signature: '0xabcdef1234567890'
        })
      }).rejects.toThrow()
    })

    it('throws an error if required signature is missing', async () => {
      await expect(async () => {
        await users.addAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: '0x1234567890123456789012345678901234567890',
            chain: 'eth'
          }
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('removeAssociatedWallet', () => {
    it('removes an associated ethereum wallet if valid metadata is provided', async () => {
      const result = await users.removeAssociatedWallet({
        userId: '7eP5n',
        wallet: {
          address: '0x1234567890123456789012345678901234567890',
          chain: 'eth'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('removes an associated solana wallet if valid metadata is provided', async () => {
      const result = await users.removeAssociatedWallet({
        userId: '7eP5n',
        wallet: {
          address: '5FHwkrdxkjgwwmeNq4Gu168KzTXdMxZY8wuTvqxDbB1E',
          chain: 'sol'
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid ethereum address is provided', async () => {
      await expect(async () => {
        await users.removeAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: '0xinvalid', // Invalid eth address
            chain: 'eth'
          }
        })
      }).rejects.toThrow()
    })

    it('throws an error if invalid solana address is provided', async () => {
      await expect(async () => {
        await users.removeAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: 'invalid', // Invalid sol address
            chain: 'sol'
          }
        })
      }).rejects.toThrow()
    })

    it('throws an error if invalid chain is provided', async () => {
      await expect(async () => {
        await users.removeAssociatedWallet({
          userId: '7eP5n',
          wallet: {
            address: '0x1234567890123456789012345678901234567890',
            chain: 'invalid' as any
          }
        })
      }).rejects.toThrow()
    })

    it('throws an error if required fields are missing', async () => {
      await expect(async () => {
        await users.removeAssociatedWallet({
          userId: '7eP5n'
          // Missing wallet object
        } as any)
      }).rejects.toThrow()
    })
  })

  describe('updateCollectibles', () => {
    it('updates the user collectibles if valid metadata is provided', async () => {
      const result = await users.updateCollectibles({
        userId: '7eP5n',
        collectibles: {
          order: ['collection1'],
          collection1: {}
        }
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('allows empty collectibles metadata', async () => {
      const result = await users.updateCollectibles({
        userId: '7eP5n',
        collectibles: null
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await users.updateCollectibles({
          userId: '7eP5n',
          collectibles: {} as any // Invalid collectibles metadata
        })
      }).rejects.toThrow()
    })
  })
})
