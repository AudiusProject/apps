import { App } from '@pedalboard/basekit'
import { Knex } from 'knex'
import { SharedData } from './config'
import { discoveryDb, identityDb } from './utils'
import { WebClient } from '@slack/web-api'
import moment from 'moment'
import { Table, TrendingResults, Users } from '@pedalboard/storage'

enum TrendingTypes {
  Tracks = 'TrendingType.TRACKS',
  UndergroundTracks = 'TrendingType.UNDERGROUND_TRACKS'
}

type TrendingEntry = {
  handle: string // twitter or discovery
  rank: number
}

export const announceTopTrending = async (
  app: App<SharedData>,
  maybeWeek?: string
) => {
  const week = maybeWeek || moment().format('YYYY-MM-DD')

  console.log('getting top trending for week ', week)

  const [tracks, undergroundTracks] = await queryTopTrending(
    discoveryDb,
    week
  )

  const trackHandles = await queryHandles(discoveryDb, identityDb, tracks)
  const undergroundHandles = await queryHandles(
    discoveryDb,
    identityDb,
    undergroundTracks
  )

  const trackEntries = assembleEntries(trackHandles, tracks)
  const undergroundEntries = assembleEntries(
    undergroundHandles,
    undergroundTracks
  )

  console.log('track entries', JSON.stringify(trackEntries))
  console.log('underground entries', JSON.stringify(undergroundEntries))

  const trendingTracksTweet = composeTweet(
    'Top 10 Trending Tracks 🔥',
    week,
    trackEntries
  )
  const trendingUndergroundTweet = composeTweet(
    'Top 10 Trending Underground 🎵',
    week,
    undergroundEntries
  )

  const { slackBotToken, slackChannel } = app.viewAppData()
  const webClient = new WebClient(slackBotToken)
  await sendTweet(
    webClient,
    [trendingTracksTweet, trendingUndergroundTweet],
    slackChannel
  )
}

export const queryTopTrending = async (
  discoveryDb: Knex,
  week: string
): Promise<TrendingResults[][]> => {
  const tracks = await discoveryDb<TrendingResults>(Table.TrendingResults)
    .where('type', '=', TrendingTypes.Tracks)
    .where('week', '=', week)
    .orderBy('rank')
    .limit(10)

  const undergroundTracks = await discoveryDb<TrendingResults>(
    Table.TrendingResults
  )
    .where('type', '=', TrendingTypes.UndergroundTracks)
    .where('week', '=', week)
    .orderBy('rank')
    .limit(10)

  return [tracks, undergroundTracks]
}

export const queryHandles = async (
  discoveryDb: Knex,
  identityDb: Knex,
  trendingResults: TrendingResults[]
): Promise<Map<number, string>> => {
  const blockchainUserIds = trendingResults.map((res) => res.user_id)
  const userHandles = await identityDb('Users')
    .select('handle', 'blockchainUserId')
    .whereIn('blockchainUserId', blockchainUserIds)
  const handles = userHandles.map((handle) => handle.handle)
  const twitterHandles = await discoveryDb<Users>(Table.Users)
    .select('handle', 'twitter_handle')
    .whereIn('handle', handles)
    .andWhere('is_current', true)
  const handleMap = new Map<number, string>()
  for (const userId of blockchainUserIds) {
    const userHandle = userHandles.find(
      (handle) => handle.blockchainUserId === userId
    )
    const twitterHandle = twitterHandles.find(
      (handle) =>
        handle.handle === userHandle.handle && handle.twitter_handle !== null
    )
    if (twitterHandle === undefined)
      handleMap.set(userId, `@/${userHandle.handle}`)
    else {
      handleMap.set(userId, `@${twitterHandle.twitter_handle}`)
    }
  }
  return handleMap
}

export const assembleEntries = (
  userIdToHandle: Map<number, string>,
  trendingResults: TrendingResults[]
): TrendingEntry[] => {
  const trendingEntries = []
  for (const result of trendingResults) {
    const { rank, user_id } = result
    const handle = userIdToHandle.get(user_id)!
    trendingEntries.push({
      handle,
      rank
    })
  }
  return trendingEntries
}

export const composeTweet = (
  title: string,
  week: string,
  entries: TrendingEntry[]
): string => {
  // order by rank in case db queries reordered in some way
  const orderedEntries = entries.sort((a, b) => {
    if (a.rank < b.rank) return -1 // a has a lower number, thus a higher rank
    if (a.rank > b.rank) return 1 // a has a higher number, thus a lower rank
    return 0 // ranks are equal, no sort to be done
  })
  const newLine = '\n'
  const handles = orderedEntries
    .map((entry) => `${entry.handle}${newLine}`)
    .join('')
  return '```\n' + `${title} (${week})` + newLine + handles + '```'
}

const sendTweet = async (
  slack: WebClient,
  tweets: string[],
  channel?: string
) => {
  if (channel === undefined) throw Error('SLACK_CHANNEL not defined')
  for (const tweet of tweets) {
    await slack.chat.postMessage({
      channel,
      text: tweet
    })
  }
}
