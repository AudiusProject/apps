import { sdk } from '@audius/sdk'
import dotenv from 'dotenv'
import { ethers } from 'ethers'

/**
 * File that you can run via `npm run sandbox` to do some manual testing.
 */
export const main = async () => {
  dotenv.config({ path: './dev.env' })

  const provider = new ethers.providers.JsonRpcProvider(
    'http://audius-eth-ganache-1'
  )
  const { chainId } = await provider.getNetwork()
  console.log(`chain id = ${chainId}`)

  const apiKey = process.env.SANDBOX_API_KEY
  const apiSecret = process.env.SANDBOX_API_SECRET

  const audiusSdk = sdk({
    appName: 'experimentalDiscoveryRelay',
    apiKey,
    apiSecret,
    environment: 'development'
  })
  const { data } = await audiusSdk.users.getUserByHandle({
    handle: 'totallynotalec'
  })
  const userId = data?.id!
  const res = await audiusSdk.users.updateUser({
    id: userId,
    userId,
    metadata: {
      bio: `identity has no reigns on me ${new Date().getTime()}`
    }
  })
  console.log({ res })
}

main().catch((e) => {
  console.error(e)
  process.exit()
})
