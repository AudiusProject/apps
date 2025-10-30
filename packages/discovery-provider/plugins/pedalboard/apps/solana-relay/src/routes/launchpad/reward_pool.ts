import { RewardManagerProgram } from '@audius/spl'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js'

import { config } from '../../config'

import { deriveEthAddressForMint } from './derive_eth_address_for_mint'

const DOMAIN = Buffer.from('claimAuthority')

const REWARD_MANAGER_SIZE = 66 // 1 (version) + 32 (token_account) + 32 (manager) + 1 (min_votes)
const TOKEN_ACCOUNT_SIZE = 165

const STAGE_SENDERS = [
  // creatornode9.staging.audius.co
  {
    senderEthAddress: '0x140eD283b33be2145ed7d9d15f1fE7bF1E0B2Ac3',
    operatorEthAddress: '0x140eD283b33be2145ed7d9d15f1fE7bF1E0B2Ac3'
  },
  // creatornode11.staging.audius.co
  {
    senderEthAddress: '0x4c88d2c0f4c4586b41621aD6e98882ae904B98f6',
    operatorEthAddress: '0x4c88d2c0f4c4586b41621aD6e98882ae904B98f6'
  },
  // creatornode12.staging.audius.co
  {
    senderEthAddress: '0x6b52969934076318863243fb92E9C4b3A08267b5',
    operatorEthAddress: '0x6b52969934076318863243fb92E9C4b3A08267b5'
  }
]

const PROD_SENDERS = [
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
  // dn2.monophonic.digital
  {
    senderEthAddress: '0x422541273087beC833c57D3c15B9e17F919bFB1F',
    operatorEthAddress: '0x6470Daf3bd32f5014512bCdF0D02232f5640a5BD'
  }
]

/**
 * Creates a reward pool and registers senders (including a deterministic
 * fourth "claimauthority" sender derived from (HD_ROOT, mint)).
 *
 * A reward pool deployment has:
 * - rewardManager account: to track state of reward instance
 * - manager account: to manage the initial senders
 * - authority account: the PDA that owns the token accounts where funds are stored
 * - token account: (unused), we store on the ATA of the authority instead
 */
export const createRewardPool = async ({
  connection,
  feePayer,
  manager,
  tokenAccount,
  rewardManager,
  mint
}: {
  connection: Connection
  feePayer: Keypair
  manager: Keypair
  tokenAccount: Keypair
  rewardManager: Keypair
  mint: PublicKey
}) => {
  const instructions: TransactionInstruction[] = []

  // 1. Create reward manager account (to track state)
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: rewardManager.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(REWARD_MANAGER_SIZE),
      space: REWARD_MANAGER_SIZE,
      programId: new PublicKey(config.rewardsManagerProgramId)
    })
  )

  // 2. Create token account (note: initialize via your program or add SPL init)
  // This is not the ATA for the authority and therefore is not used as the leftover receiver.
  instructions.push(
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
  instructions.push(
    RewardManagerProgram.createInitInstruction({
      rewardManagerState: rewardManager.publicKey,
      tokenAccount: tokenAccount.publicKey,
      mint,
      manager: manager.publicKey,
      minVotes: 3,
      rewardManagerProgramId: new PublicKey(config.rewardsManagerProgramId)
    })
  )

  const authority = RewardManagerProgram.deriveAuthority({
    programId: new PublicKey(config.rewardsManagerProgramId),
    rewardManagerState: rewardManager.publicKey
  })

  // 4. Add senders (all static senders + deterministic claim authority)
  const baseSenders =
    config.environment === 'prod' ? PROD_SENDERS : STAGE_SENDERS

  const { address: claimAuthorityEthAddress } = deriveEthAddressForMint(
    DOMAIN,
    config.launchpadDeterministicSecret,
    mint
  )
  const senders = [
    ...baseSenders,
    {
      senderEthAddress: claimAuthorityEthAddress,
      // Use a static address for the claim authority so multiple claim authorities can't be used
      // to override other senders.
      operatorEthAddress: '0x0000000000000000000000000000000000000000'
    }
  ]

  for (const sender of senders) {
    const derivedSender = RewardManagerProgram.deriveSender({
      ethAddress: sender.senderEthAddress,
      programId: new PublicKey(config.rewardsManagerProgramId),
      authority
    })
    instructions.push(
      RewardManagerProgram.createSenderInstruction({
        senderEthAddress: sender.senderEthAddress,
        operatorEthAddress: sender.operatorEthAddress,
        rewardManagerState: rewardManager.publicKey,
        manager: manager.publicKey,
        authority,
        payer: feePayer.publicKey,
        sender: derivedSender,
        rewardManagerProgramId: new PublicKey(config.rewardsManagerProgramId)
      })
    )
  }

  // 5. Resign manager
  instructions.push(
    RewardManagerProgram.createChangeManagerAccountInstruction({
      rewardManagerState: rewardManager.publicKey,
      currentManager: manager.publicKey,
      newManager: PublicKey.default,
      rewardManagerProgramId: new PublicKey(config.rewardsManagerProgramId)
    })
  )

  return instructions
}
