import chalk from 'chalk'
import { Command, Option } from '@commander-js/extra-typings'

import {
  getCurrentUserId,
  initializeAudiusSdk,
  parseBoolean
} from '../utils.js'
import { outputFormatOption } from '../common-options.js'

export const editUserCommand = new Command('edit')
  .description('Update an existing user')
  .argument('<handle>', "The user's handle (can't change)")
  .option('-n, --name <name>', "The user's new name")
  .option('-b, --bio <bio>', "The user's new bio")
  .option('-l, --location <location>', "The user's new location")
  .addOption(outputFormatOption)
  .action(async (handle, { name, bio, location, output }) => {
    const audiusSdk = await initializeAudiusSdk({ handle })
    const userId = await getCurrentUserId()

    const result = await audiusSdk.users.updateProfile({
      userId,
      metadata: { name, bio, location }
    })

    if (output === 'json') {
      console.log(JSON.stringify(result))
    } else {
      console.log(chalk.green('Successfully updated user!'))
    }
  })
