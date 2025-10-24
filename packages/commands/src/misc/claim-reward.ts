import chalk from 'chalk'
import { Command, Option } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'
import { ChallengeId, GenerateSpecifierRequest } from '@audius/sdk'

export const claimRewardCommand = new Command('claim-reward')
  .description('Claim a challenge reward')
  .argument('<challengeId>', 'The ID of the challenge to claim')
  .argument('<amount>', 'The amount to claim', parseFloat)
  .option('-f, --from <from>', 'The account to claim from')
  .option(
    '-c, --contentId <contentId>',
    'The track or album purchased (for Audio Match challenges)'
  )
  .option(
    '-r, --referredUserId <referredUserId>',
    'The user referred (for referral challenges)'
  )
  .action(async (challengeId, amount, { from, contentId, referredUserId }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const specifier = await audiusSdk.challenges.generateSpecifier({
      challengeId: challengeId as ChallengeId,
      userId,
      contentId,
      referredUserId
    } as GenerateSpecifierRequest)
    const res = await audiusSdk.rewards.claimRewards({
      claimRewardsRequest: {
        userId,
        challengeId: challengeId as ChallengeId,
        specifier
      }
    })
    console.log(chalk.green('Successfully claimed reward'))
    console.log(chalk.yellow.bold('Transaction Signature:'), res)
  })

export const claimRewardsCommand = new Command('claim-rewards')
  .description('Claim all challenge rewards')
  .option('-f, --from <from>', 'The account to claim from')
  .option(
    '-u, --userId <userId>',
    'The user ID to claim for (defaults to signed in user)'
  )
  .addOption(
    new Option(
      '-c, --challengeId <challengeId>',
      'The challenge ID to claim'
    ).argParser((v) => ChallengeId[v as keyof typeof ChallengeId])
  )
  .option('-s, --specifier <specifier>', 'The specifier to claim')
  .action(async ({ from, userId, challengeId, specifier }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const currentUserId = await getCurrentUserId()

    const res = await audiusSdk.challenges.claimAllRewards({
      userId: userId === undefined ? currentUserId : userId,
      challengeId,
      specifier
    })
    console.log(chalk.green('Successfully claimed reward'))
    console.log(chalk.yellow.bold('Transaction Signatures:'), res)
  })

export const rewardSpecifierCommand = new Command('reward-specifier')
  .description('Get the specifier for a challenge')
  .argument('<challengeId>', 'The ID of the challenge')
  .option('-f, --from <from>', 'The account to call from')
  .option('-c, --contentId <contentId>', 'The track or album purchased')
  .option('-r, --referredUserId <referredUserId>', 'The user referred')
  .action(async (challengeId, { from, contentId, referredUserId }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const specifier = await audiusSdk.challenges.generateSpecifier({
      challengeId,
      userId,
      contentId,
      referredUserId
    } as GenerateSpecifierRequest)
    console.log(chalk.yellow.bold('Specifier:'), specifier)
  })
