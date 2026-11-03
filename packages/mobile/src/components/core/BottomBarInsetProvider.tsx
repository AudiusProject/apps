import type { ReactNode } from 'react'
import { useState } from 'react'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BOTTOM_BAR_HEIGHT } from '../bottom-tab-bar/constants'
import { PLAY_BAR_HEIGHT } from '../now-playing-drawer/constants'

import {
  BottomBarInsetContext,
  SetPlayBarVisibilityContext
} from './BottomBarInsetContext'

export const BottomBarInsetProvider = ({
  children
}: {
  children: ReactNode
}) => {
  const { bottom } = useSafeAreaInsets()
  const [isPlayBarVisible, setPlayBarVisible] = useState(false)
  const inset =
    BOTTOM_BAR_HEIGHT + bottom + (isPlayBarVisible ? PLAY_BAR_HEIGHT : 0)

  return (
    <SetPlayBarVisibilityContext.Provider value={setPlayBarVisible}>
      <BottomBarInsetContext.Provider value={inset}>
        {children}
      </BottomBarInsetContext.Provider>
    </SetPlayBarVisibilityContext.Provider>
  )
}
