import { program } from 'commander'

import { sdk as audiusSdk } from '../sdk'
import { EntityManagerAction, EntityType } from '../services'
import { HashId } from '../types/HashId'

program
  .command('verify')
  .description('Verify a user')
  .option('-h, --handle <handle>', 'The handle to verify')
  .option('-s, --socialHandle <social-handle>', 'The social handle to verify')
  .option('--privateKey <privateKey>', 'The private key to use for the request')
  .option(
    '-e, --environment <environment>',
    'The environment to use for the request',
    'production'
  )
  .option(
    '-p, --platform <platform>',
    'The platform to verify (twitter, instagram, tiktok, manual)'
  )
  .action(async (args) => {
    if (!args.handle || !args.platform || !args.privateKey) {
      console.error(
        'Missing required arguments: handle, socialHandle, and platform are required'
      )
      process.exit(1)
    }
    if (args.platform !== 'manual' && !args.socialHandle) {
      console.error(
        'Missing required arguments: socialHandle is required for non-manual verification'
      )
      process.exit(1)
    }
    if (!['twitter', 'instagram', 'tiktok', 'manual'].includes(args.platform)) {
      console.error('Invalid platform:', args.platform)
      process.exit(1)
    }

    const sdk = audiusSdk({
      appName: 'verify-user',
      apiSecret: args.privateKey,
      environment: args.environment
    })

    try {
      const user = await sdk.users.getUserByHandle({ handle: args.handle })
      const userId = HashId.parse(user.data?.id)
      console.info('Verifying user', userId)

      const config: {
        is_verified: boolean
        twitter_handle?: string
        instagram_handle?: string
        tiktok_handle?: string
      } = {
        is_verified: true
      }
      if (args.platform === 'twitter') {
        config.twitter_handle = args.socialHandle
      } else if (args.platform === 'instagram') {
        config.instagram_handle = args.socialHandle
      } else if (args.platform === 'tiktok') {
        config.tiktok_handle = args.socialHandle
      }

      console.info('With config', config)
      console.info('Sending tx...')
      const { blockHash, blockNumber } =
        await sdk.services.entityManager.manageEntity({
          userId,
          entityType: EntityType.USER,
          entityId: userId,
          action: EntityManagerAction.VERIFY,
          metadata: JSON.stringify({
            cid: '',
            data: config
          })
        })
      console.info('Block hash', blockHash)
      console.info('Block number', blockNumber)
      process.exit(0)
    } catch (error) {
      console.error('Verification failed:', error)
      process.exit(1)
    }
  })

program.parseAsync()
