import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import {
  initializeAudiusSdk,
  currentHandle,
  getCurrentUserHandle
} from '../utils.js'

import { ResponseError } from '@audius/sdk'

const blockCommand = new Command('block')
  .description('Blocks a user from the Anti-Abuse Oracle')
  .option('-f, --from <from>', 'The account for which to generate auth headers')
  .action(async ({ from }) => {
    // Initting sdk sets current handle...
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const handle = await getCurrentUserHandle()
    const res = await fetch(
      'http://audius-discovery-provider-1/attestation/block-user',
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic dGVzdDp0ZXN0',
          ['Content-Type']: 'application/x-www-form-urlencoded'
        },
        body: `handle=${handle}`
      }
    )
    if (!res.ok) {
      throw new ResponseError(res, 'Failed to unblock user')
    }
    console.log(chalk.green('Successfully unblocked user!'))
    console.log(chalk.yellow.bold('Handle:'), handle)
  })

const unblockCommand = new Command('unblock')
  .description('Unblocks a user from the Anti-Abuse Oracle')
  .option('-f, --from <from>', 'The account for which to generate auth headers')
  .action(async ({ from }) => {
    // Initting sdk sets current handle...
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const handle = await getCurrentUserHandle()
    const res = await fetch(
      'http://audius-discovery-1/attestation/unblock-user',
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic dGVzdDp0ZXN0',
          ['Content-Type']: 'application/x-www-form-urlencoded'
        },
        body: `handle=${handle}`
      }
    )
    if (!res.ok) {
      throw new ResponseError(res, 'Failed to unblock user')
    }
    console.log(chalk.green('Successfully unblocked user!'))
    console.log(chalk.yellow.bold('Handle:'), handle)
  })

export const aaoCommand = new Command('aao')
  .description('Commands for the AAO plugin')
  .addCommand(blockCommand)
  .addCommand(unblockCommand)
