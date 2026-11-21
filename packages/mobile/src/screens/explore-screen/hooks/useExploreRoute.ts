import type { RouteProp } from '@react-navigation/core'
import { useRoute as useRouteRN } from '@react-navigation/core'

import type { ExploreTabScreenParamList } from '../../app-screen/ExploreTabScreen'

export const useExploreRoute = <
  RouteName extends keyof ExploreTabScreenParamList
>() => {
  return useRouteRN<RouteProp<ExploreTabScreenParamList, RouteName>>()
}
