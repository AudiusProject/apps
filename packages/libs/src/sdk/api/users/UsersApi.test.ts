import fs from 'fs'
import path from 'path'

import { ClaimableTokensProgram } from '@audius/spl'
import { DecodedTransferClaimableTokensInstruction } from '@audius/spl/dist/types/claimable-tokens/types'
import { beforeAll, expect, jest } from '@jest/globals'
import {
  PublicKey,
  Secp256k1Program,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'

import {
  AppAuth,
  ClaimableTokensClient,
  SolanaRelay,
  SolanaRelayWalletAdapter
} from '../../services'
import { DiscoveryNodeSelector } from '../../services/DiscoveryNodeSelector'
import { EntityManager } from '../../services/EntityManager'
import { Logger } from '../../services/Logger'
import { Storage } from '../../services/Storage'
import { StorageNodeSelector } from '../../services/StorageNodeSelector'
import { getReaction } from '../../utils/reactionsMap'
import { Configuration } from '../generated/default'

import { UsersApi } from './UsersApi'

const pngFile = fs.readFileSync(
  path.resolve(__dirname, '../../test/png-file.png')
)

jest.mock('../../services/EntityManager')

jest.spyOn(Storage.prototype, 'uploadFile').mockImplementation(async () => {
  return {
    id: 'a',
    status: 'done',
    results: {
      '320': 'a'
    },
    probe: {
      format: {
        duration: '10'
      }
    }
  }
})

jest
  .spyOn(EntityManager.prototype, 'manageEntity')
  .mockImplementation(async () => {
    return {
      blockHash: 'a',
      blockNumber: 1
    } as any
  })

describe('UsersApi', () => {
  let users: UsersApi

  const auth = new AppAuth('key', 'secret')
  const logger = new Logger()
  const discoveryNodeSelector = new DiscoveryNodeSelector()
  const storageNodeSelector = new StorageNodeSelector({
    auth,
    discoveryNodeSelector,
    logger
  })
  const solanaRelay = new SolanaRelay()
  const claimableTokens = new ClaimableTokensClient({
    solanaWalletAdapter: new SolanaRelayWalletAdapter({ solanaRelay })
  })

  beforeAll(() => {
    users = new UsersApi(
      new Configuration(),
      discoveryNodeSelector,
      new Storage({ storageNodeSelector, logger: new Logger() }),
      new EntityManager({ discoveryNodeSelector: new DiscoveryNodeSelector() }),
      auth,
      new Logger(),
      claimableTokens
    )
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'debug').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
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

  describe('sendTip', () => {
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
          '8sMVcgngd3ZBSAuQA6weYZn9WeXtU5TqZA8sAb9q1CS'
        ),
        [receiverUserId]: new PublicKey(
          'C75DLcu2XTbBVjjCZwKDxPyCnEvaRAkcTMKJ3woNgNWg'
        )
      }

      // Turn the relay call into a bunch of assertions on the final transaction
      jest
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
      jest
        .spyOn(SolanaRelay.prototype, 'getFeePayer')
        .mockImplementation(async () => {
          return feePayer
        })

      // Mock getWalletAndUserBank
      jest
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
      jest.spyOn(auth, 'sign').mockImplementation(async () => {
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
})
