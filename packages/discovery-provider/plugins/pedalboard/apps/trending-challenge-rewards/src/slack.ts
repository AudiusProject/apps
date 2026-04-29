import { App as SlackApp, SlackCommandMiddlewareArgs } from '@slack/bolt'
import { AlignmentEnum, AsciiTable3 } from 'ascii-table3'
import { App } from '@pedalboard/basekit'
import { Err, Ok, Result } from 'ts-results'
import { SharedData } from './config'
import { onDisburse } from './rewards'
import { ChallengeDisbursementUserbankFriendly } from './queries'
import { announceTopFiveTrending } from './trending'
import { isValidDate } from './utils'

export const establishSlackConnection = async (app: App<SharedData>) => {
  const slack = initSlack(app).unwrap()
  const port = 3008
  await slack.start(port)
  console.log('slack connection established ⚡️')
}

export const initSlack = (app: App<SharedData>): Result<SlackApp, string> => {
  const { slackBotToken, slackSigningSecret, slackAppToken } = app.viewAppData()

  if (slackBotToken === undefined) return new Err('botToken undefined')
  if (slackSigningSecret === undefined)
    return new Err('signingSecret undefined')
  if (slackAppToken === undefined) return new Err('appToken undefined')

  const slackApp = new SlackApp({
    token: slackBotToken,
    signingSecret: slackSigningSecret,
    socketMode: true,
    appToken: slackAppToken
  })

  // register callbacks
  slackApp.command('/echo', async (args) => await echo(app, args))
  slackApp.command(
    '/disburse',
    async (args) => await disburse(app, args, false)
  )
  slackApp.command(
    '/disbursetest',
    async (args) => await disburse(app, args, true)
  )
  slackApp.command('/trending', async (args) => await trending(app, args))

  return new Ok(slackApp)
}

const echo = async (
  app: App<SharedData>,
  args: SlackCommandMiddlewareArgs
): Promise<void> => {
  const { command, ack, respond } = args
  await ack()
  await respond(`${command.text}`)
}

const disburse = async (
  app: App<SharedData>,
  args: SlackCommandMiddlewareArgs,
  dryRun: boolean
): Promise<void> => {
  const { command, ack, respond } = args
  await ack()

  // parse out command date if exists
  const cmdText = command.text
  const isValidSpecifier = isValidDate(cmdText)
  if (!isValidSpecifier) {
    await respond(`${cmdText} not a valid date, please format in YYYY-MM-DD`)
    return
  }
  await onDisburse(app, dryRun, cmdText)
}

const trending = async (
  app: App<SharedData>,
  args: SlackCommandMiddlewareArgs
): Promise<void> => {
  const { command, ack } = args
  await ack()
  const text = command.text
  if (text !== undefined && text.trim() !== '')
    await announceTopFiveTrending(app, text)
  else {
    await announceTopFiveTrending(app)
  }
}

export const formatDisbursementTable = (
  challenges: ChallengeDisbursementUserbankFriendly[]
): string => {
  const matrix = challenges.map((challenge) => [
    challenge.challenge_id,
    challenge.handle,
    challenge.slot
  ])
  console.log(matrix)
  return new AsciiTable3('Challenge Disbursements')
    .setHeading('Challenge', 'Handle', 'Slot')
    .setAlign(3, AlignmentEnum.CENTER)
    .addRowMatrix(matrix)
    .toString()
}
