import { createContext, useContext, ReactNode, useMemo } from 'react'

import { useMedia as useMediaQuery } from 'react-use'

import { breakpoints } from '../foundations/breakpoints'

export type MediaContextType = {
  isExtraSmall: boolean
  isSmall: boolean
  isMedium: boolean
  isLarge: boolean
  isExtraLarge: boolean

  isAboveExtraSmall: boolean
  isAboveSmall: boolean
  isAboveMedium: boolean
  isAboveLarge: boolean
  isAboveExtraLarge: boolean

  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean

  matchesQuery: (query: string) => boolean
}

const MediaContext = createContext<MediaContextType | null>(null)

type MediaProviderProps = {
  children: ReactNode
}

/**
 * Provider component that monitors media queries and makes responsive breakpoints
 * available throughout the app via context.
 */
export const MediaProvider = ({ children }: MediaProviderProps) => {
  const isExtraSmall = useMediaQuery(breakpoints.down.xs)
  const isSmall = useMediaQuery(breakpoints.down.sm)
  const isMedium = useMediaQuery(breakpoints.down.md)
  const isLarge = useMediaQuery(breakpoints.down.lg)
  const isExtraLarge = useMediaQuery(breakpoints.down.xl)

  const isAboveExtraSmall = useMediaQuery(breakpoints.up.xs)
  const isAboveSmall = useMediaQuery(breakpoints.up.sm)
  const isAboveMedium = useMediaQuery(breakpoints.up.md)
  const isAboveLarge = useMediaQuery(breakpoints.up.lg)
  const isAboveExtraLarge = useMediaQuery(breakpoints.up.xl)

  const isMobile = isSmall
  const isTablet = !isSmall && !isAboveMedium
  const isDesktop = isAboveMedium

  const matchesQuery = (query: string) => {
    return window.matchMedia(query).matches
  }

  const value = useMemo(
    () => ({
      isExtraSmall,
      isSmall,
      isMedium,
      isLarge,
      isExtraLarge,
      isAboveExtraSmall,
      isAboveSmall,
      isAboveMedium,
      isAboveLarge,
      isAboveExtraLarge,
      isMobile,
      isTablet,
      isDesktop,
      matchesQuery
    }),
    [
      isExtraSmall,
      isSmall,
      isMedium,
      isLarge,
      isExtraLarge,
      isAboveExtraSmall,
      isAboveSmall,
      isAboveMedium,
      isAboveLarge,
      isAboveExtraLarge,
      isMobile,
      isTablet,
      isDesktop
    ]
  )

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>
}

/**
 * Hook to access media query state from the MediaContext.
 * This hook should be used instead of the original useMedia hook
 * to avoid creating multiple listeners in every component.
 */
export const useMedia = (): MediaContextType => {
  const context = useContext(MediaContext)

  if (context === null) {
    throw new Error('useMedia must be used within a MediaProvider')
  }

  return context
}
