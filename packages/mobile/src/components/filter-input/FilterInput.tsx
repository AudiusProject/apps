import { useCallback, useState } from 'react'

import type { TextInputProps as RNTextInputProps } from 'react-native'
import { Pressable, TextInput as RNTextInput } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'

import type { FlexProps } from '@audius/harmony-native'
import {
  Flex,
  IconCloseAlt,
  IconSearch,
  useTheme
} from '@audius/harmony-native'

const messages = {
  clear: 'Clear filter'
}

const INPUT_HEIGHT = 40

type FilterInputProps = Omit<FlexProps, 'children'> &
  Pick<RNTextInputProps, 'onChangeText' | 'placeholder' | 'value' | 'autoFocus'>

/**
 * A search-style text field for narrowing a list in place. Sits flush on the
 * page above the list it filters, with no card around it.
 */
export const FilterInput = (props: FilterInputProps) => {
  const {
    onChangeText,
    placeholder,
    value: valueProp,
    autoFocus,
    ...flexProps
  } = props
  const { color, typography, spacing } = useTheme()

  // Mirror the text so the clear button works for uncontrolled callers too.
  const [internalValue, setInternalValue] = useState(valueProp ?? '')
  const value = valueProp ?? internalValue

  const handleChangeText = useCallback(
    (text: string) => {
      setInternalValue(text)
      onChangeText?.(text)
    },
    [onChangeText]
  )

  const handleClear = useCallback(() => {
    handleChangeText('')
  }, [handleChangeText])

  return (
    <Animated.View layout={LinearTransition}>
      <Flex
        row
        alignItems='center'
        gap='s'
        mh='l'
        mv='s'
        ph='m'
        h={INPUT_HEIGHT}
        backgroundColor='surface2'
        style={{ borderRadius: INPUT_HEIGHT / 2 }}
        {...flexProps}
      >
        <IconSearch color='subdued' size='s' />
        <RNTextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={color.text.subdued}
          value={value}
          onChangeText={handleChangeText}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize='none'
          returnKeyType='search'
          clearButtonMode='never'
          style={{
            flex: 1,
            height: INPUT_HEIGHT,
            padding: 0,
            fontFamily: typography.fontByWeight.medium,
            fontSize: typography.size.m,
            color: color.text.default
          }}
        />
        {value ? (
          <Pressable
            onPress={handleClear}
            accessibilityRole='button'
            accessibilityLabel={messages.clear}
            hitSlop={spacing.s}
          >
            <IconCloseAlt color='subdued' size='s' />
          </Pressable>
        ) : null}
      </Flex>
    </Animated.View>
  )
}
