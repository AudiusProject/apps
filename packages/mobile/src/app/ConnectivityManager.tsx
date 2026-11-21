import { useEnterForeground } from 'app/hooks/useAppState'
import { forceRefreshConnectivity } from 'app/utils/reachability'

export const ConnectivityManager = () => {
  useEnterForeground(() => {
    forceRefreshConnectivity()
  })

  return null
}
