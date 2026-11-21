import type { ReactNode } from 'react'

import { useIsRestoring } from '@tanstack/react-query'
import { View } from 'react-native'

import { useScreenContext } from './ScreenContextProvider'

type ScreenSecondaryContentProps = {
  children: ReactNode
  skeleton?: ReactNode
}

export const ScreenSecondaryContent = (props: ScreenSecondaryContentProps) => {
  const { children, skeleton } = props
  const { isPrimaryContentReady } = useScreenContext()
  const isRestoring = useIsRestoring()

  const showReal = isPrimaryContentReady && !isRestoring

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {showReal ? children : (skeleton ?? null)}
    </View>
  )
}
