import type { ComponentType, ReactElement, ReactNode } from 'react'
import { useEffect, useLayoutEffect } from 'react'

import type { Nullable } from '@audius/common/utils'
import { useNavigation } from '@react-navigation/native'
import { pickBy, negate, isUndefined } from 'lodash'
import type { Animated, StyleProp, ViewProps, ViewStyle } from 'react-native'
import { View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { screen } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import type { ThemeColors } from 'app/utils/theme'
import { useThemePalette } from 'app/utils/theme'

import { ScreenContextProvider } from './ScreenContextProvider'
import { SecondaryScreenTitle } from './SecondaryScreenTitle'

type ScreenVariant = 'primary' | 'secondary' | 'secondaryAlt' | 'white'

const removeUndefined = (object: Record<string, unknown>) =>
  pickBy(object, negate(isUndefined))

const getBackgroundColor = (variant: ScreenVariant, palette: ThemeColors) => {
  switch (variant) {
    case 'primary':
      return palette.background
    case 'secondary':
      return palette.background
    case 'secondaryAlt':
      return palette.backgroundSecondary
    default:
      return palette.white
  }
}

const useStyles = makeStyles(() => ({
  root: {
    flex: 1
  }
}))

export type ScreenProps = {
  children: ReactNode
  topbarLeft?: Nullable<ReactElement>
  topbarLeftStyle?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>
  topbarRight?: Nullable<ReactElement>
  topbarRightStyle?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>
  title?: Nullable<ReactNode>
  icon?: ComponentType<SvgProps>
  IconProps?: SvgProps
  headerTitle?: Nullable<(() => ReactNode) | string>
  style?: StyleProp<ViewStyle>
  // url used for screen view analytics
  url?: string
  variant?: ScreenVariant
  as?: ComponentType<ViewProps>
  header?: () => ReactElement
}

export const Screen = (props: ScreenProps) => {
  const {
    children,
    topbarLeft,
    topbarRight,
    title: titleProp = null,
    icon,
    IconProps,
    headerTitle: headerTitleProp,
    topbarRightStyle,
    topbarLeftStyle,
    url,
    variant = 'primary',
    style,
    as: RootComponent = View,
    header
  } = props
  const palette = useThemePalette()
  const styles = useStyles()
  const backgroundColor = getBackgroundColor(variant, palette)
  const navigation = useNavigation()
  const isSecondary = variant === 'secondary' || variant === 'white'

  // Record screen view
  useEffect(() => {
    if (url) {
      screen({ route: url })
    }
  }, [url])

  useLayoutEffect(() => {
    navigation.setOptions(
      removeUndefined({
        header,
        headerShown: header ? true : undefined,
        headerLeft: topbarLeft === undefined ? undefined : () => topbarLeft,
        headerRight: topbarRight
          ? () => topbarRight
          : isSecondary
            ? null
            : topbarRight,
        title: isSecondary ? undefined : titleProp,
        headerTitle: isSecondary
          ? () => (
              <SecondaryScreenTitle
                icon={icon!}
                title={titleProp}
                IconProps={IconProps}
              />
            )
          : headerTitleProp
      })
    )
  }, [
    navigation,
    topbarLeftStyle,
    topbarLeft,
    topbarRight,
    topbarRightStyle,
    titleProp,
    isSecondary,
    headerTitleProp,
    icon,
    IconProps,
    header
  ])

  return (
    <RootComponent style={[styles.root, style, { backgroundColor }]}>
      <ScreenContextProvider>{children}</ScreenContextProvider>
    </RootComponent>
  )
}
