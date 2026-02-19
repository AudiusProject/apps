import { useCallback } from 'react'

import type { Genre } from '@audius/common/utils'
import { convertGenreLabelToValue } from '@audius/common/utils'
import { css } from '@emotion/native'
import { ScrollView } from 'react-native'

import { Flex, SelectablePill, useTheme } from '@audius/harmony-native'
import type { CollapsibleTopTabBarProps } from 'app/components/top-tab-bar/CollapsibleTopTabBar'

type SelectedGenresTabBarProps = CollapsibleTopTabBarProps

export const SelectedGenresTabBar = (props: SelectedGenresTabBarProps) => {
  const { state, navigation, onTabPress } = props
  const { color } = useTheme()

  const { routes } = state

  const onPress = useCallback(
    (route: any, tabIndex: number) => {
      onTabPress(route.name)
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true
      })

      if (state.index !== tabIndex && !event.defaultPrevented) {
        navigation.navigate({
          name: route.name,
          merge: true,
          params: { tabIndex }
        })
      }
    },
    [navigation, onTabPress, state.index]
  )

  return (
    <ScrollView
      horizontal
      accessibilityRole='tablist'
      style={css({ backgroundColor: color.background.white })}
    >
      <Flex direction='row' gap='s' p='l'>
        {routes.map((route, index) => {
          const { name, key } = route
          const isFocused = state.index === index
          return (
            <SelectablePill
              key={key}
              type='radio'
              label={convertGenreLabelToValue(name as Genre)}
              isSelected={isFocused}
              accessibilityRole='tablist'
              accessibilityState={{ selected: isFocused }}
              onPress={() => onPress(route, index)}
            />
          )
        })}
      </Flex>
    </ScrollView>
  )
}
