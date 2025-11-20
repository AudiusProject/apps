import { useCallback } from 'react'

import { AudiusSdk } from '@audius/sdk'

import { useQueryContext } from '~/api'
import { Env } from '~/services/env'
import { AUDIUS_DISCORD_OAUTH_LINK } from '~/utils/route'

// Returns a random character
const getRandomSignableCharacter = () => {
  const vals = 'abcdefghijklmnopqrstuvwxyz123456789'
  return vals.charAt(Math.floor(Math.random() * vals.length))
}

// Sends a signed message to the discord bot, which will then parse the signature and return back a JWT
// The JWT will be sent thru the discord OAuth flow and then back to the discord server eventually
// The purpose of this is so that the discord server can verify that the user is the one signing,
// while also not exposing any details since the oauth flow requires data be passed via query params
const requestDiscordJWT = async (sdk: AudiusSdk, env: Env) => {
  const data = getRandomSignableCharacter()
  const signature = await sdk.services.audiusWalletClient.signMessage({
    message: data
  })
  const response = await fetch(
    `${env.DISCORD_BOT_SERVER}/request_discord_code?signature=${encodeURIComponent(signature)}&message=${encodeURIComponent(data)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  if (!response.ok) {
    throw new Error('Failed to request Discord JWT')
  }
  return response.json()
}

export const useGetDiscordOAuthLink = (currentCoin?: string) => {
  const { audiusSdk, env } = useQueryContext()

  return useCallback(async () => {
    const sdk = await audiusSdk()
    const discordJWT = await requestDiscordJWT(sdk, env)

    const statePayload = JSON.stringify({
      jwt: discordJWT.token,
      currentCoin
    })
    return `${AUDIUS_DISCORD_OAUTH_LINK}&state=${statePayload}`
  }, [audiusSdk, env, currentCoin])
}
