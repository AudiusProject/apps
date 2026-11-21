import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'

import { useWindowDimensions } from 'react-native'

import { useHinge } from './useHinge'

export const WIDE_LAYOUT_MIN_WIDTH = 600

export type FoldPosture = 'phone' | 'open' | 'book'

type FoldLayout = {
  posture: FoldPosture
  isWide: boolean
  windowWidth: number
}

const FoldLayoutContext = createContext<FoldLayout>({
  posture: 'phone',
  isWide: false,
  windowWidth: 0
})

export const FoldLayoutProvider = ({ children }: { children: ReactNode }) => {
  const { width } = useWindowDimensions()
  const hinge = useHinge()
  const isWide = width >= WIDE_LAYOUT_MIN_WIDTH
  const isBook = isWide && hinge.available && hinge.status === 'partiallyOpen'

  const value = useMemo(
    () => ({
      posture: (isBook ? 'book' : isWide ? 'open' : 'phone') as FoldPosture,
      isWide,
      windowWidth: width
    }),
    [isBook, isWide, width]
  )

  return (
    <FoldLayoutContext.Provider value={value}>
      {children}
    </FoldLayoutContext.Provider>
  )
}

export const useFoldLayout = () => useContext(FoldLayoutContext)
