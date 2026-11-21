import {
  restrictedHandles as commonRestrictedHandles,
  route
} from '@audius/common/utils'

const { orderedRoutes } = route

const restrictedRoutes = orderedRoutes
  .filter((routePath) => (routePath.match(/\//g) || []).length === 1)
  .filter((routePath) => !routePath.includes(':'))
  .map((routePath) => routePath.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
  .filter((routePath) => routePath !== '')
  .map((h) => h.toLowerCase())

export const restrictedHandles = new Set([
  ...commonRestrictedHandles,
  ...restrictedRoutes
])
