import { useCallback, useContext } from 'react'

import { clearSearch } from '@audius/web/src/common/store/search-bar/actions'
import type { ParamListBase, RouteProp } from '@react-navigation/core'
import type {
  NativeStackNavigationOptions,
  NativeStackNavigationProp
} from '@react-navigation/native-stack'
import { CardStyleInterpolators } from '@react-navigation/stack'
import { Text, View } from 'react-native'
import { useDispatch } from 'react-redux'

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
import type { AppTabScreenParamList } from './AppTabScreen'
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
  },
  earlyAccess: {
    fontSize: 10,
    position: 'absolute',
    fontFamily: typography.fontByWeight.bold,
    color: palette.primary,
    letterSpacing: 0.5,
    left: 30,
    top: 18,
    width: 72
  }
}))

type ParamList = AppScreenParamList & Pick<AppTabScreenParamList, 'Search'>

type Options = {
  navigation: NativeStackNavigationProp<ParamList>
  route: RouteProp<ParamListBase>
}

export const useAppScreenOptions = (
  overrides?: Partial<NativeStackNavigationOptions>
) => {
  const styles = useStyles()
  const navigation = useNavigation()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const dispatch = useDispatch()

  const handleOpenLeftNavDrawer = useCallback(() => {
    drawerHelpers?.openDrawer()
  }, [drawerHelpers])

  const handlePressSearch = useCallback(() => {
    dispatch(clearSearch())
    navigation.navigate('Search', { autoFocus: true })
  }, [dispatch, navigation])

  const screenOptions: (options: Options) => NativeStackNavigationOptions =
    useCallback(
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
              <>
                <IconAudiusLogoHorizontal
                  height={24}
                  width={100}
                  color='subdued'
                />
              </>
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
