import { useUserByParams } from '@audius/common/api'
import { useLocation } from 'react-router'

import { getPathname } from 'utils/route'
import { parseUserRoute } from 'utils/route/userRouteParser'

export const useProfileParams = () => {
  const location = useLocation()
  const pathname = getPathname(location)
  const params = parseUserRoute(pathname)
  const { data: user } = useUserByParams(params ?? {})

  return user
}
