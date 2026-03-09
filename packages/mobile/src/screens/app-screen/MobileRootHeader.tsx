import type { ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconAudiusLogoHorizontal } from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
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
  logoContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: 22,
    width: 78,
    height: 16,
    opacity: 0.45
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
 * Audius logo is positioned in the status bar area (under dynamic island)
 * at low opacity so it appears in screenshots but is hidden behind the
 * system chrome during normal use.
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
      <View style={styles.logoContainer}>
        <IconAudiusLogoHorizontal height={16} width={78} color='subdued' />
      </View>
      <View style={[styles.row, { marginTop: insets.top }]}>
        <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
        <View style={styles.titleContainer}>
          <GradientText accessibilityRole='header' style={styles.title}>
            {title}
          </GradientText>
        </View>
        {children}
      </View>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  )
}
