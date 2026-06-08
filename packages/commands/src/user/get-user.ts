import { Command } from '@commander-js/extra-typings'
import { getCurrentUserId, initializeAudiusSdk } from '../utils'

export const getUserCommand = new Command('get')
  .description('Get a user by ID')
  .argument('<id>', 'The user to fetch')
  .option('--from <from>', 'The account to use')
  .action(async (id, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()
    const { data: track } = await audiusSdk.users.getUser({ userId, id })
    console.info(track)
  })
