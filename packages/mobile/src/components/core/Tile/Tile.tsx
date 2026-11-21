import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { useCallback } from 'react'

import type {
  GestureResponderEvent,
  PressableProps,
  StyleProp,
  ViewStyle
} from 'react-native'
import { Animated, View } from 'react-native'

import { usePressScaleAnimation } from 'app/hooks/usePressScaleAnimation'
import type { StylesProp } from 'app/styles'
import { shadow, makeStyles } from 'app/styles'

import { Pressable } from '../Pressable'

const borderRadius = 8
const shadowStyles = shadow()

const useStyles = makeStyles(({ palette }) => ({
  tile: {
    flexDirection: 'row',
    borderColor: palette.neutralLight8,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderRadius,
    ...shadowStyles
  },
  content: {
    flex: 1
  }
}))

const defaultElement = View

type TilePressableProps = Pick<
  PressableProps,
  'onPress' | 'onPressIn' | 'onPressOut' | 'pointerEvents'
>

type TileOwnProps<TileComponentType extends ComponentType = ComponentType> =
  TilePressableProps & {
    children: ReactNode
    scaleTo?: number
    style?: StyleProp<ViewStyle>
    styles?: StylesProp<{
      root: ViewStyle
      tile: ViewStyle
      content: ViewStyle
    }>
    as?: TileComponentType
  }

export type TileProps<
  TileComponentType extends ComponentType = typeof defaultElement
> = TileOwnProps<TileComponentType> &
  Omit<ComponentProps<TileComponentType>, keyof TileOwnProps>

export const Tile = <
  TileComponentType extends ComponentType = typeof defaultElement
>(
  props: TileProps<TileComponentType>
) => {
  const styles = useStyles()

  const {
    as: TileComponent = defaultElement,
    children,
    onPress,
    onPressIn,
    onPressOut,
    style,
    styles: stylesProp,
    scaleTo,
    pointerEvents,
    ...other
  } = props

  const {
    scale,
    handlePressIn: handlePressInScale,
    handlePressOut: handlePressOutScale
  } = usePressScaleAnimation(scaleTo)

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      onPressIn?.(event)
      if (onPress) {
        handlePressInScale()
      }
    },
    [onPressIn, onPress, handlePressInScale]
  )

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      onPressOut?.(event)
      if (onPress) {
        handlePressOutScale()
      }
    },
    [onPressOut, onPress, handlePressOutScale]
  )

  return (
    <Animated.View
      style={[style, stylesProp?.root, { transform: [{ scale }] }]}
    >
      <TileComponent style={[styles.tile, stylesProp?.tile]} {...other}>
        <Pressable
          pointerEvents={pointerEvents}
          style={[{ borderRadius: 4 }, styles.content, stylesProp?.content]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {children}
        </Pressable>
      </TileComponent>
    </Animated.View>
  )
}
