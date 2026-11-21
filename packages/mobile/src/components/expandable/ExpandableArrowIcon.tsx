import { useEffect, useRef } from 'react'

import { Animated } from 'react-native'

import type { IconProps } from '@audius/harmony-native'
import { IconCaretDown } from '@audius/harmony-native'

const springToValue = ({
  animation,
  value
}: {
  animation: Animated.Value
  value: number
}) => {
  Animated.spring(animation, {
    toValue: value,
    tension: 160,
    friction: 15,
    useNativeDriver: true
  }).start()
}

type ExpandableArrowIconProps = {
  expanded: boolean
  size?: IconProps['size']
}

export const ExpandableArrowIcon = ({
  expanded,
  size = 'm' as IconProps['size']
}: ExpandableArrowIconProps) => {
  const rotateAnim = useRef(new Animated.Value(0))

  useEffect(() => {
    springToValue({
      animation: rotateAnim.current,
      value: expanded ? 180 : 0
    })
  }, [expanded])

  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: rotateAnim.current.interpolate({
              inputRange: [0, 180],
              outputRange: ['0deg', '-180deg']
            })
          }
        ]
      }}
    >
      <IconCaretDown size={size} color='default' />
    </Animated.View>
  )
}
