import chalk from 'chalk'
import { Command, program } from '@commander-js/extra-typings'

import { decodeHashId } from '@audius/sdk'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const followEventCommand = new Command('follow')
  .description('Follow (subscribe to) an event')
  .argument('<eventId>', 'The event id to follow', (value) => {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && asNumber > 0 && !value.includes('-')) {
      return asNumber
    }
    return decodeHashId(value)!
  })
  .option('-f, --from <from>', 'The account to follow from')
  .action(async (eventId, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = decodeHashId(await getCurrentUserId())!

    try {
      await audiusSdk.events.followEvent({ userId, eventId })
      console.log(chalk.green(`Successfully followed event ${eventId}`))
    } catch (err) {
      program.error((err as Error).message)
    }

    process.exit(0)
  })
