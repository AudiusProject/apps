import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GradientText } from 'app/components/core'
import { OtaUpdateBanner } from 'app/components/ota-update-banner/OtaUpdateBanner'
import { useDrawer } from 'app/hooks/useDrawer'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'

type MobileRootHeaderProps = {
  title: string
  children?: ReactNode
  showDivider?: boolean
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  container: {
    backgroundColor: palette.white
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3)
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: typography.fontByWeight.bold
  },
  titleContainer: {
    flex: 1,
    minWidth: 0
  },
  divider: {
    height: 1,
    backgroundColor: palette.neutralLight8
  }
}))

/**
 * Custom header for root (bottom-bar) tab screens.
 *
 * Layout (single row): [Avatar] [GradientText title] [right content]
 *
 * The screenshot-only Audius logo that previously lived here behind the
 * Dynamic Island has moved up to AppDrawerScreen as a top-level overlay so
 * it doesn't animate with the screen during stack transitions.
 */
export const MobileRootHeader = (props: MobileRootHeaderProps) => {
  const { title, children, showDivider = true } = props
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')

  const handleOpenLeftNavDrawer = useCallback(() => {
    if (isNowPlayingDrawerOpen) return
    drawerHelpers?.openDrawer()
  }, [drawerHelpers, isNowPlayingDrawerOpen])

  return (
    <View style={styles.container}>
      <View style={{ marginTop: insets.top }}>
        <OtaUpdateBanner />
        <View style={styles.row}>
          <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
          <View style={styles.titleContainer}>
            <GradientText accessibilityRole='header' style={styles.title}>
              {title}
            </GradientText>
          </View>
          {children}
        </View>
      </View>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  )
}
