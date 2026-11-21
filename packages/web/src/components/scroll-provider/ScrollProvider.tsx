import { memo, createContext, useCallback } from 'react'

import { route } from '@audius/common/utils'
import { matchPath } from 'react-router'

import { useInstanceVar } from 'hooks/useInstanceVar'
import { useIsMobile } from 'hooks/useIsMobile'

const { TRACK_PAGE, NOTIFICATION_PAGE } = route

type ScrollRecords = { [route: string]: number }

type ScrollContextProps = {
  setScrollForRoute: (route: string, scroll: number) => void
  getScrollForRoute: (route: string) => number
}

export const ScrollContext = createContext<ScrollContextProps>({
  setScrollForRoute: (route: string, scroll: number) => {},
  getScrollForRoute: (route: string) => 0
})

const SCROLL_PRESERVATION_BLACKLIST = [TRACK_PAGE, NOTIFICATION_PAGE]

export const ScrollProvider = memo((props: { children: JSX.Element }) => {
  const [getScrollRecords, setScrollRecords] = useInstanceVar<ScrollRecords>({})

  const setScrollForRoute = useCallback(
    (route: string, scroll: number) => {
      let inBlacklist = false
      SCROLL_PRESERVATION_BLACKLIST.forEach((path) => {
        const match = matchPath(path, route)
        if (match) {
          inBlacklist = true
        }
      })
      if (inBlacklist) return
      setScrollRecords((s) => ({ ...s, [route]: scroll }))
    },
    [setScrollRecords]
  )

  const getScrollForRoute = useCallback(
    (route: string) => {
      return getScrollRecords()[route] || 0
    },
    [getScrollRecords]
  )

  if (useIsMobile()) {
    return (
      <ScrollContext.Provider
        value={{
          setScrollForRoute,
          getScrollForRoute
        }}
      >
        {props.children}
      </ScrollContext.Provider>
    )
  }

  return props.children
})
