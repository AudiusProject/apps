import chalk from 'chalk'
import { Command, program } from '@commander-js/extra-typings'

import { decodeHashId } from '@audius/sdk'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const unfollowEventCommand = new Command('unfollow')
  .description('Unfollow (unsubscribe from) an event')
  .argument('<eventId>', 'The event id to unfollow', (value) => {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && asNumber > 0 && !value.includes('-')) {
      return asNumber
    }
    return decodeHashId(value)!
  })
  .option('-f, --from <from>', 'The account to unfollow from')
  .action(async (eventId, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = decodeHashId(await getCurrentUserId())!

    try {
      await audiusSdk.events.unfollowEvent({ userId, eventId })
      console.log(chalk.green(`Successfully unfollowed event ${eventId}`))
    } catch (err) {
      program.error((err as Error).message)
    }

    process.exit(0)
  })
