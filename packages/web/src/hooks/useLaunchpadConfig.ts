import {
  QUERY_KEYS,
  QueryContextType,
  useQueryContext
} from '@audius/common/api'
import { queryOptions, useQuery } from '@tanstack/react-query'

import {
  AUDIO_DECIMALS,
  TOKEN_DECIMALS
} from 'pages/artist-coins-launchpad-page/constants'

type LaunchpadConfigHookResponse = {
  maxAudioInputAmount: number
  maxTokenOutputAmount: number
}

type FetchLaunchpadConfigContext = Pick<QueryContextType, 'audiusSdk'>

const getLaunchpadConfigQueryKey = () => [QUERY_KEYS.launchpadConfig] as const

const getLaunchpadConfigQueryFn =
  (context: FetchLaunchpadConfigContext) => async () => {
    const { audiusSdk } = context

    const sdk = await audiusSdk()

    const launchpadConfigRes =
      await sdk.services.solanaRelay.getLaunchpadConfig()

    return {
      maxAudioInputAmount: Math.ceil(
        Number(launchpadConfigRes.maxAudioInputAmount) / 10 ** AUDIO_DECIMALS
      ),
      maxTokenOutputAmount: Math.floor(
        Number(launchpadConfigRes.maxTokenOutputAmount) / 10 ** TOKEN_DECIMALS
      )
    } as LaunchpadConfigHookResponse
  }

/**
 * Helper function to get the query options for fetching launchpad config.
 * Useful for getting the query key tagged with the data type stored in the cache.
 */
const getLaunchpadConfigOptions = (context: FetchLaunchpadConfigContext) => {
  return queryOptions({
    queryKey: getLaunchpadConfigQueryKey(),
    queryFn: getLaunchpadConfigQueryFn(context)
  })
}

export const useLaunchpadConfig = (
  options?: Partial<ReturnType<typeof getLaunchpadConfigOptions>>
) => {
  const context = useQueryContext()
  return useQuery({
    ...options,
    ...getLaunchpadConfigOptions(context)
  })
}
