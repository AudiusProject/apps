import { useCallback, useContext } from 'react'

import type { ParamListBase, RouteProp } from '@react-navigation/core'
import type { Theme } from '@react-navigation/native'
import type {
  NativeStackNavigationOptions,
  NativeStackNavigationProp
} from '@react-navigation/native-stack'
import { CardStyleInterpolators } from '@react-navigation/stack'
import { Text, View } from 'react-native'

import {
  IconAudiusLogoHorizontal,
  IconButton,
  IconCaretLeft,
  IconSearch
} from '@audius/harmony-native'
import type { ContextualParams } from 'app/hooks/useNavigation'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { AccountPictureHeader } from './AccountPictureHeader'
import type { AppScreenParamList } from './AppTabsScreen'

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  headerLeft: { marginLeft: spacing(-2) + 1, width: 40 },
  headerRight: {
    paddingVertical: spacing(2),
    paddingLeft: spacing(2)
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontByWeight.heavy,
    color: palette.neutralLight5,
    textTransform: 'uppercase'
  },
  audiusLogo: {
    height: 24,
    width: 93,
    marginRight: 10
  }
}))

type Options<ParamList extends ParamListBase = AppScreenParamList> = {
  navigation: NativeStackNavigationProp<ParamList, string, string | undefined>
  route: RouteProp<ParamList, string>
  theme: Theme
}

export const useAppScreenOptions = <
  ParamList extends ParamListBase = AppScreenParamList
>(
  overrides?: Partial<NativeStackNavigationOptions>
) => {
  const styles = useStyles()
  const navigation = useNavigation()
  const { drawerHelpers } = useContext(AppDrawerContext)

  const handleOpenLeftNavDrawer = useCallback(() => {
    drawerHelpers?.openDrawer()
  }, [drawerHelpers])

  const handlePressSearch = useCallback(() => {
    navigation.navigate('explore', {
      screen: 'SearchExplore',
      params: { autoFocus: true }
    })
  }, [navigation])

  const screenOptions: (
    options: Options<ParamList>
  ) => NativeStackNavigationOptions = useCallback(
    (options) => {
      const { navigation, route } = options
      const { params } = route
      const isFromAppLeftDrawer =
        params && (params as ContextualParams).fromAppDrawer

      return {
        animation: isFromAppLeftDrawer ? 'none' : 'default',
        fullScreenGestureEnabled: true,
        freezeOnBlur: true,
        cardOverlayEnabled: true,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerBackVisible: false,
        headerLeft: (props) => {
          const { canGoBack, ...other } = props
          if (canGoBack) {
            return (
              <View style={styles.headerLeft}>
                <IconButton
                  icon={IconCaretLeft}
                  color='subdued'
                  size='l'
                  {...other}
                  onPress={() => navigation.pop()}
                />
              </View>
            )
          }
          return (
            <View style={[styles.headerLeft, { marginLeft: 0 }]}>
              <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
            </View>
          )
        },
        title: '',
        headerTitle: ({ children }) => {
          if (children === 'none') return null
          if (children) {
            return (
              <Text style={styles.title} accessibilityRole='header'>
                {children}
              </Text>
            )
          }
          return (
            <View>
              <IconAudiusLogoHorizontal
                height={24}
                width={100}
                color='subdued'
              />
            </View>
          )
        },
        headerRightContainerStyle: styles.headerRight,
        headerRight: () => {
          return (
            <View style={styles.headerRight}>
              <IconButton
                icon={IconSearch}
                onPress={handlePressSearch}
                hitSlop={20}
                color='subdued'
                size='m'
              />
            </View>
          )
        },
        ...overrides
      }
    },
    [handleOpenLeftNavDrawer, handlePressSearch, styles, overrides]
  )

  return screenOptions
}
