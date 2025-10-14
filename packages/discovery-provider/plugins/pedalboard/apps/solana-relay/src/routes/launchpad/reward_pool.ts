import { RewardManagerProgram } from '@audius/spl'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js'

// Constants
const REWARD_MANAGER_SIZE = 66 // 1 (version) + 32 (token_account) + 32 (manager) + 1 (min_votes)
const TOKEN_ACCOUNT_SIZE = 165

const SENDERS = [
  // creatornode.audius.co
  {
    senderEthAddress: '0xc8d0C29B6d540295e8fc8ac72456F2f4D41088c8',
    operatorEthAddress: '0xe5b256d302ea2f4e04B8F3bfD8695aDe147aB68d'
  },
  // audius-cn1.tikilabs.com
  {
    senderEthAddress: '0x159200F84c2cF000b3A014cD4D8244500CCc36ca',
    operatorEthAddress: '0xe4882D9A38A2A1fc652996719AF0fb15CB968d0a'
  },
  // audius-content-1.figment.io
  {
    senderEthAddress: '0xBfdE9a7DD3620CB6428463E9A9e9932B4d10fdc5',
    operatorEthAddress: '0xc1f351FE81dFAcB3541e59177AC71Ed237BD15D0'
  }
]

export const createRewardPool = async ({
  connection,
  rewardManager,
  tokenAccount,
  feePayer,
  mint
}: {
  connection: Connection
  feePayer: Keypair
  rewardManager: Keypair
  tokenAccount: Keypair
  mint: PublicKey
}) => {
  // The manager is responsible for creating the first senders
  const manager = Keypair.generate()

  const transaction = new Transaction()

  // 1. Create reward manager account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: rewardManager.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(REWARD_MANAGER_SIZE),
      space: REWARD_MANAGER_SIZE,
      programId: RewardManagerProgram.programId
    })
  )

  // 2. Create token account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE),
      space: TOKEN_ACCOUNT_SIZE,
      programId: TOKEN_PROGRAM_ID
    })
  )

  // 3. Initialize reward manager
  transaction.add(
    RewardManagerProgram.createInitInstruction({
      rewardManagerState: rewardManager.publicKey,
      tokenAccount: tokenAccount.publicKey,
      mint,
      manager: manager.publicKey,
      minVotes: 3
    })
  )

  const authority = RewardManagerProgram.deriveAuthority({
    programId: RewardManagerProgram.programId,
    rewardManagerState: rewardManager.publicKey
  })

  // 4. Add senders
  for (const sender of SENDERS) {
    transaction.add(
      RewardManagerProgram.createSenderInstruction({
        senderEthAddress: sender.senderEthAddress,
        operatorEthAddress: sender.operatorEthAddress,
        rewardManagerState: rewardManager.publicKey,
        manager: manager.publicKey,
        authority,
        payer: feePayer.publicKey,
        sender: feePayer.publicKey,
        rewardManagerProgramId: RewardManagerProgram.programId
      })
    )
  }

  // 5. Resign manager
  transaction.add(
    RewardManagerProgram.createChangeManagerAccountInstruction({
      rewardManagerState: rewardManager.publicKey,
      currentManager: manager.publicKey,
      newManager: PublicKey.default,
      rewardManagerProgramId: RewardManagerProgram.programId
    })
  )

  return transaction
}
