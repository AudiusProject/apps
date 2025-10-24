import { Fragment, useState, useEffect, useRef, useCallback } from 'react'

import type { LayoutChangeEvent, TextStyle, ViewStyle } from 'react-native'
import { Animated, Pressable, View } from 'react-native'

import { Text, Flex } from '@audius/harmony-native'
import { light } from 'app/haptics'
import type { StylesProps } from 'app/styles'
import { makeStyles } from 'app/styles'

import type { IconComponent } from '../../harmony-native/icons'

// Note, offset is the inner padding of the container div
const offset = 3

export type Option<Value> = {
  key: Value
  text: string
  leftIcon?: IconComponent
}

export type SegmentedControlProps<Value> = {
  // The options to display for the tab slider
  options: Array<Option<Value>>

  // Key of selected option
  selected?: Value

  // Key of initially selected option
  defaultSelected?: Value

  // Callback fired when new option is selected
  onSelectOption: (key: Value) => void

  // If true, all tabs will have the same width
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
  const [initLeft, setInitLeft] = useState(false)
  const leftAnim = useRef(new Animated.Value(0)).current
  const widthAnim = useRef(new Animated.Value(0)).current
  const [selected, setSelected] = useState(defaultSelected)
  const selectedOption = selectedProp ?? selected

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

    springToValue(leftAnim, left)
    springToValue(widthAnim, width)
  }, [options, selectedOption, leftAnim, widthAnim, optionWidths, getLeftValue])

  // Watch for the options widths to be populated and then set the initial left value of the selector thumb
  useEffect(() => {
    if (!initLeft && optionWidths.every((val) => val !== 0)) {
      leftAnim.setValue(getLeftValue())

      // Calculate maxOptionWidth considering container constraints
      const naturalMaxWidth = optionWidths.reduce((a, b) => Math.max(a, b), 0)

      if (fullWidth && equalWidth && containerWidth > 0) {
        // Calculate available width for options (subtract padding and separators)
        const separatorsWidth = (options.length - 1) * 1 // 1px per separator
        const availableWidth = containerWidth - offset * 2 - separatorsWidth
        const equalOptionWidth = Math.floor(availableWidth / options.length)

        // Use the smaller of natural max width or calculated equal width
        setMaxOptionWidth(Math.min(naturalMaxWidth, equalOptionWidth))
      } else {
        setMaxOptionWidth(naturalMaxWidth)
      }

      setInitLeft(true)
    }
  }, [
    optionWidths,
    initLeft,
    options,
    leftAnim,
    selectedOption,
    getLeftValue,
    fullWidth,
    equalWidth,
    containerWidth
  ])

  const setOptionWidth = (i: number) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout

    if (i === 0) {
      springToValue(leftAnim, offset)
      springToValue(widthAnim, width)
    }
    setOptionWidths([
      ...optionWidths.slice(0, i),
      width,
      ...optionWidths.slice(i + 1)
    ])

    // Set the width of the selector thumb to the width of the selected option
    if (options[i].key === selectedOption) {
      widthAnim.setValue(width)
    }
  }

  const sliderElement = (
    <Animated.View
      style={[styles.slider, { left: leftAnim, width: widthAnim }]}
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
          // Hide separator right of the last option
          index === options.length - 1 ||
          // Hide separator right of an option if the next one is selected
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
