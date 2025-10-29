#!/usr/bin/env node

import { program } from '@commander-js/extra-typings'

import chalk from 'chalk'
import type { ResponseError } from '@audius/sdk'
import { managerCommand } from './manager/account-managers.js'
import { authHeadersCommand } from './misc/auth-headers.js'
import {
  claimRewardCommand,
  claimRewardsCommand,
  rewardSpecifierCommand
} from './misc/claim-reward.js'
import { createUserBankCommand } from './misc/create-user-bank.js'
import { mintCommand } from './misc/mint.js'
import { tipReactionCommand } from './misc/tip-reaction.js'
import { withdrawTokensCommand } from './misc/withdraw-tokens.js'
import { playlistCommand } from './playlist/index.js'
import { trackCommand } from './track/index.js'
import { userCommand } from './user/index.js'
import { albumCommand } from './album/index.js'
import { entropyCommand } from './misc/entropy.js'
import { aaoCommand } from './misc/aao.js'
import { commentCommand } from './comments/index.js'

async function main() {
  program.name('audius-cmd')
  program.description(
    'CLI interface for interacting with a local Audius network.'
  )
  program.addCommand(userCommand)
  program.addCommand(trackCommand)
  program.addCommand(playlistCommand)
  program.addCommand(albumCommand)
  program.addCommand(commentCommand)
  program.addCommand(managerCommand)
  program.addCommand(authHeadersCommand)
  program.addCommand(claimRewardCommand)
  program.addCommand(claimRewardsCommand)
  program.addCommand(rewardSpecifierCommand)
  program.addCommand(createUserBankCommand)
  program.addCommand(mintCommand)
  program.addCommand(tipReactionCommand)
  program.addCommand(withdrawTokensCommand)
  program.addCommand(entropyCommand)
  program.addCommand(aaoCommand)

  try {
    await program.parseAsync(process.argv)
  } catch (err) {
    if ('response' in (err as Error)) {
      const resErr = err as ResponseError
      console.log(
        chalk.red('Request ID:'),
        resErr.response.headers.get('X-Request-ID')
      )
      console.log(chalk.red('Request URL:'), resErr.response.url)
      console.log(chalk.red('Response Body:'), await resErr.response.text())
    }
    throw err
  }
  process.exit(0)
}

main()
