import { Fragment, useState, useEffect, useRef, useCallback } from 'react'

import type { LayoutChangeEvent, TextStyle, ViewStyle } from 'react-native'
import { Animated, Pressable, View } from 'react-native'

import { Text, Flex } from '@audius/harmony-native'
import { light } from 'app/haptics'
import type { StylesProps } from 'app/styles'
import { makeStyles } from 'app/styles'

import type { IconComponent } from '../../harmony-native/icons'

const offset = 3

export type Option<Value> = {
  key: Value
  text: string
  leftIcon?: IconComponent
}

export type SegmentedControlProps<Value> = {
  options: Array<Option<Value>>

  selected?: Value

  defaultSelected?: Value

  onSelectOption: (key: Value) => void

  equalWidth?: boolean

  fullWidth?: boolean
} & StylesProps<{
  root: ViewStyle
  tab: ViewStyle
  text: TextStyle
  activeText: TextStyle
}>

const springToValue = (
  animation: Animated.Value,
  value: number,
  finished?: () => void
) => {
  Animated.spring(animation, {
    toValue: value,
    tension: 160,
    friction: 15,
    useNativeDriver: false
  }).start(finished)
}

const useStyles = makeStyles(({ palette, typography, spacing }) => ({
  tabs: {
    borderRadius: 6,
    backgroundColor: palette.neutralLight7,
    flexDirection: 'row',
    alignItems: 'center',
    padding: offset
  },
  tab: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  separator: {
    width: 1,
    backgroundColor: palette.neutralLight5,
    height: 15
  },
  hideSeparator: {
    opacity: 0
  },
  slider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 4,
    backgroundColor: palette.background,
    shadowOpacity: 0.1,
    shadowOffset: {
      width: 0,
      height: 2
    }
  },
  fullWidth: {
    width: '100%'
  },
  tabFullWidth: {
    flexGrow: 1,
    textAlign: 'center'
  }
}))

export const SegmentedControl = <Value,>(
  props: SegmentedControlProps<Value>
) => {
  const {
    options,
    selected: selectedProp,
    defaultSelected = options[0].key,
    onSelectOption,
    fullWidth,
    equalWidth,
    style,
    styles: stylesProp
  } = props
  const styles = useStyles()
  const [optionWidths, setOptionWidths] = useState(options.map(() => 0))
  const [maxOptionWidth, setMaxOptionWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const leftAnim = useRef(new Animated.Value(0)).current
  const widthAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [selected, setSelected] = useState(defaultSelected)
  const selectedOption = selectedProp ?? selected
  const lastSelectedOption = useRef<Value | null>(null)

  const handleSelectOption = (option: Value) => {
    light()
    onSelectOption?.(option)
    setSelected(option)
  }

  const getLeftValue = useCallback(() => {
    const selectedOptionIdx = options.findIndex(
      (option) => option.key === selectedOption
    )
    return optionWidths
      .slice(0, selectedOptionIdx)
      .reduce((totalWidth, width) => totalWidth + width, offset)
  }, [optionWidths, options, selectedOption])

  useEffect(() => {
    const selectedOptionIdx = options.findIndex(
      (option) => option.key === selectedOption
    )
    const width = optionWidths[selectedOptionIdx]
    const left = getLeftValue()

    if (width === 0 || !optionWidths.every((val) => val !== 0)) {
      return
    }

    const isUserSelection =
      lastSelectedOption.current !== null &&
      lastSelectedOption.current !== selectedOption

    if (isUserSelection) {
      springToValue(leftAnim, left)
      springToValue(widthAnim, width)
    } else {
      leftAnim.setValue(left)
      widthAnim.setValue(width)
    }

    if (!isReady) {
      opacityAnim.setValue(1)
      setIsReady(true)
    }

    lastSelectedOption.current = selectedOption
  }, [
    options,
    selectedOption,
    leftAnim,
    widthAnim,
    opacityAnim,
    optionWidths,
    getLeftValue,
    isReady
  ])

  useEffect(() => {
    if (!optionWidths.every((val) => val !== 0)) return

    const naturalMaxWidth = optionWidths.reduce((a, b) => Math.max(a, b), 0)

    if (fullWidth && equalWidth && containerWidth > 0) {
      const separatorsWidth = (options.length - 1) * 1
      const availableWidth = containerWidth - offset * 2 - separatorsWidth
      const equalOptionWidth = Math.floor(availableWidth / options.length)

      setMaxOptionWidth(Math.min(naturalMaxWidth, equalOptionWidth))
    } else {
      setMaxOptionWidth(naturalMaxWidth)
    }
  }, [optionWidths, options, fullWidth, equalWidth, containerWidth])

  const setOptionWidth = (i: number) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout
    setOptionWidths((prev) => {
      const next = [...prev]
      next[i] = width
      return next
    })
  }

  const sliderElement = (
    <Animated.View
      style={[
        styles.slider,
        { left: leftAnim, width: widthAnim, opacity: opacityAnim }
      ]}
    />
  )

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout
    setContainerWidth(width)
  }

  return (
    <View
      style={[
        styles.tabs,
        fullWidth && styles.fullWidth,
        style,
        stylesProp?.root
      ]}
      onLayout={handleContainerLayout}
    >
      {sliderElement}
      {options.map((option, index) => {
        const shouldHideSeparator =
          selectedOption === option.key ||
          index === options.length - 1 ||
          selectedOption === options[index + 1].key
        const isSelected = option.key === selectedOption

        return (
          <Fragment key={option.text}>
            <Pressable
              onLayout={setOptionWidth(index)}
              style={[
                styles.tab,
                stylesProp?.tab,
                fullWidth && styles.tabFullWidth,
                equalWidth && maxOptionWidth > 0 && { width: maxOptionWidth }
              ]}
              onPress={() => handleSelectOption(option.key)}
            >
              <Flex direction='row' alignItems='center' gap='s'>
                {option.leftIcon ? (
                  <option.leftIcon
                    size='s'
                    color={isSelected ? 'default' : 'subdued'}
                  />
                ) : null}
                <Text
                  size='s'
                  color={isSelected ? 'default' : 'subdued'}
                  strength='strong'
                  style={[
                    stylesProp?.text,
                    isSelected && stylesProp?.activeText
                  ]}
                >
                  {option.text}
                </Text>
              </Flex>
            </Pressable>
            {index !== options.length - 1 ? (
              <View
                style={[
                  styles.separator,
                  shouldHideSeparator && styles.hideSeparator
                ]}
              />
            ) : null}
          </Fragment>
        )
      })}
    </View>
  )
}
