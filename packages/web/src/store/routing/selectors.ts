import type { Location } from 'history'

import { AppState } from 'store/types'

export const getLocation = (state: AppState): Location | undefined => {
  return undefined
}

export const getLocationPathname = (state: AppState): string => {
  return ''
}
