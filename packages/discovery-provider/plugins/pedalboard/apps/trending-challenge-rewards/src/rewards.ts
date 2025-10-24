import { App } from '@pedalboard/basekit'
import { Knex } from 'knex'
import { Ok, Err, Result } from 'ts-results'
import { SharedData } from './config'
import {
  getChallengesDisbursementsUserbanksFriendlyEnsureSlots,
  getTrendingChallenges,
  getTrendingChallengesByDate,
  getCompletedBlockNumberFromDaysAgo
} from './queries'
import { WebClient } from '@slack/web-api'
import { formatDisbursementTable } from './slack'
import { discoveryDb } from './utils'
import { ChallengeId } from '@audius/sdk'
import axios from 'axios'

type Challenge = {
  challenge_id: string
  user_id: string
  specifier: string
  amount: string
  completed_blocknumber: number
  handle: string
  wallet: string
}

const TRENDING_ID = 'tt'
const UNDERGROUND_TRENDING_ID = 'tut'
const PLAYLIST_TRENDING_ID = 'tp'
const TRENDING_REWARD_IDS = [
  TRENDING_ID,
  PLAYLIST_TRENDING_ID,
  UNDERGROUND_TRENDING_ID
]

// TODO: move something like this into App so results are commonplace for handlers
export const disburseTrendingRewards = async (
  app: App<SharedData>
): Promise<void> => {
  const { dryRun } = app.viewAppData()
  const disburse = await onDisburse(app, dryRun)
  disburse.mapErr(console.error)
}

// dryRun separated out so it can be run manually via another trigger
export const onDisburse = async (
  app: App<SharedData>,
  dryRun: boolean,
  targetSpecifier?: string
): Promise<Result<undefined, string>> => {
  const db = discoveryDb
  const { slackBotToken, slackChannel } = app.viewAppData()
  if (slackBotToken === undefined) throw new Err('slackBotToken undefined')
  const client = new WebClient(slackBotToken)

  console.log(`doing ${dryRun ? 'a dry run' : 'a live run'}`)

  const { sdk, apiEndpoint } = app.viewAppData()

  let completedBlock, specifier
  if (!targetSpecifier) {
    const completedBlockRes = await findStartingBlock(db)
    if (completedBlockRes.err) return completedBlockRes
    const [startingBlock, startBlockSpecifier] = completedBlockRes.unwrap()
    specifier = startBlockSpecifier
    completedBlock = startingBlock
  } else {
    const response = await getTrendingChallengesByDate(db, targetSpecifier)
    const challenge = response[0]
    specifier = challenge.specifier
    completedBlock = challenge.completed_blocknumber! - 1
  }
  console.log(
    'completed blockNumber = ',
    completedBlock,
    'specifier = ',
    specifier
  )

  let endpointRetries = 10
  while (endpointRetries > 0) {
    let failedAnAttestation = false

    // Pick an endpoint and collect all undisbursed challenges from that endpoint
    console.log('endpoint = ', apiEndpoint)
    const toDisburse: Challenge[] = []
    for (const challengeId of TRENDING_REWARD_IDS) {
      let completedBlocknumber = await getCompletedBlockNumberFromDaysAgo(db, 6)
      if (completedBlocknumber === null) {
        console.error('Could not find a completed block number')
        completedBlocknumber = 0
      }
      const url = `${apiEndpoint}/v1/challenges/undisbursed?challenge_id=${challengeId}&completed_blocknumber=${completedBlocknumber}`
      console.log('fetching undisbursed challenges from url = ', url)
      // Fetch all undisbursed challenges
      const res = await axios.get(url)
      toDisburse.push(...res.data.data)
    }

    // Claim all undisbursed challenges
    for (const challenge of toDisburse) {
      const challengeId = Object.values(ChallengeId).find(
        (id) => id === challenge.challenge_id
      )!
      console.log('Claimable challengeId = ', challenge)
      const totalRetries = 10
      let res
      let retries = totalRetries
      while (retries > 0) {
        try {
          if (!dryRun) {
            console.log(
              'Claiming reward for challengeId = ',
              challengeId,
              'specifier = ',
              challenge.specifier,
              'amount = ',
              challenge.amount
            )
            res = await sdk.rewards.claimRewards({
              claimRewardsRequest: {
                challengeId,
                userId: challenge.user_id,
                specifier: challenge.specifier
              }
            })
            if (res?.data?.[0]?.error) {
              if (
                res.data[0].error.includes('failed to get oracle attestation')
              ) {
                // If the error is because the attestation failed, break
                break
              }
              throw new Error(res.data[0].error)
            }
            console.log('res = ', res)
            break // Success - exit retry loop
          }
        } catch (e) {
          console.error(
            `Error claiming reward, challengeId = ${challengeId}, attempt ${totalRetries - retries + 1} of ${totalRetries}, error = `,
            e
          )
          retries -= 1
          if (retries === 0) {
            console.error(
              `Failed to claim reward after ${totalRetries} attempts for challengeId = ${challengeId}`
            )
            failedAnAttestation = true
          }
        }
      }
    }

    // If we found no errors, continue on to confirm
    if (!failedAnAttestation) {
      break
    }
    endpointRetries -= 1
    console.error(
      `Error finding all attestations, ${endpointRetries} remaining`
    )
  }

  // Look at database to see if all challenges have been disbursed
  const trimmedSpecifier = specifier.split(':')[0]
  console.log('trimmedSpecifier = ', trimmedSpecifier)
  const friendly = await getChallengesDisbursementsUserbanksFriendlyEnsureSlots(
    db,
    trimmedSpecifier
  )

  // Format the results for Slack
  const formattedResults = formatDisbursementTable(friendly)
  console.log(formattedResults)

  if (slackChannel === undefined) return new Err('SLACK_CHANNEL not defined')
  await client.chat.postMessage({
    channel: slackChannel,
    text: '```' + formattedResults + '```'
  })

  return new Ok(undefined)
}

export const findStartingBlock = async (
  db: Knex
): Promise<Result<[number, string], string>> => {
  const challenges = await getTrendingChallenges(db)
  const firstChallenge = challenges[0]
  if (firstChallenge === undefined)
    return new Err(`no challenges found ${challenges}`)
  const completedBlocknumber = firstChallenge.completed_blocknumber
  if (completedBlocknumber === null)
    return new Err(`completed block number is null ${firstChallenge}`)
  const specifier = firstChallenge.specifier
  // Start from one before the first challenge
  return new Ok([completedBlocknumber - 1, specifier])
}
