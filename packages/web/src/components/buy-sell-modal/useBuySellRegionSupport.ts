import { useMemo } from 'react'

import { useRemoteVar } from '@audius/common/hooks'
import { StringKeys } from '@audius/common/services'
import { useAsync } from 'react-use'

import { getLocation } from 'services/Location'

/**
 * Hook to check if buy/sell functionality is supported in the user's region
 */
export const useBuySellRegionSupport = () => {
  const buySellDeniedRegions = (
    useRemoteVar(StringKeys.BUY_SELL_DENIED_COUNTRIES) ?? ''
  ).split(',')

  const { value: location } = useAsync(getLocation, [])

  const isBuySellSupported = useMemo(() => {
    return !buySellDeniedRegions.some((r) => r === location?.country_code)
  }, [buySellDeniedRegions, location])

  return {
    isBuySellSupported,
    location
  }
}
