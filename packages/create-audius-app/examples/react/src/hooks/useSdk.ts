import { sdk } from '@audius/sdk'

const apiKey = import.meta.env.VITE_AUDIUS_API_KEY as string

const instance = sdk({
  appName: 'Audius SDK React Example',
  apiKey
})

export const useSdk = () => ({ sdk: instance })
