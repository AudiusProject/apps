import { useCallback, useState, useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

import { Platform } from 'react-native'
import type {
  View,
  LayoutChangeEvent,
  ScrollView,
  FlatList
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import {
  Box,
  Flex,
  PlainButton,
  IconCaretDown,
  IconCaretUp,
  spacing,
  useTheme
} from '@audius/harmony-native'

const messages = {
  seeMore: 'See More',
  seeLess: 'See Less'
}

type ExpandableContentProps = {
  children: ReactNode
  maxLines?: number
  lineHeight?: number
  scrollRef?: RefObject<ScrollView | FlatList | null>
}

export const ExpandableContent = ({
  children,
  maxLines = 6,
  lineHeight = spacing.xl,
  scrollRef
}: ExpandableContentProps) => {
  const { motion } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const toggleButtonRef = useRef<View>(null)
  const [isButtonLayoutReady, setIsButtonLayoutReady] = useState(false)

  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const containerHeight = useSharedValue<number | null>(null)

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: '100%',
      height: containerHeight.value !== null ? containerHeight.value : 'auto',
      overflow: 'hidden'
    }
  })

  const scrollToButton = useCallback(
    (pageY: number, height: number) => {
      if (scrollRef?.current) {
        if ('scrollTo' in scrollRef.current) {
          scrollRef.current.scrollTo({
            y: pageY - height / 2,
            animated: true
          })
        } else if ('scrollToOffset' in scrollRef.current) {
          scrollRef.current.scrollToOffset({
            offset: pageY,
            animated: true
          })
        }
      }
    },
    [scrollRef]
  )

  const tryMeasureAndroid = useCallback(
    (retryCount = 0) => {
      if (!toggleButtonRef.current || !isButtonLayoutReady) return

      toggleButtonRef.current.measureInWindow((x, y, width, height) => {
        if (typeof y === 'number' && typeof height === 'number') {
          scrollToButton(y, height)
        } else if (retryCount < 3) {
          setTimeout(
            () => {
              requestAnimationFrame(() => {
                tryMeasureAndroid(retryCount + 1)
              })
            },
            50 * (retryCount + 1)
          )
        }
      })
    },
    [scrollToButton, isButtonLayoutReady]
  )

  const measureAndScroll = useCallback(() => {
    if (!toggleButtonRef.current) return

    if (Platform.OS === 'android') {
      requestAnimationFrame(() => {
        tryMeasureAndroid()
      })
    } else {
      toggleButtonRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          if (typeof pageY === 'number' && typeof height === 'number') {
            scrollToButton(pageY, height)
          }
        }
      )
    }
  }, [scrollToButton, tryMeasureAndroid])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const newIsExpanded = !prev

      if (!newIsExpanded) {
        measureAndScroll()
      }

      return newIsExpanded
    })
  }, [measureAndScroll])

  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height

      if (contentHeight === null || height > contentHeight) {
        setContentHeight(height)

        if (containerHeight.value === null) {
          const initialHeight = Math.min(height, lineHeight * maxLines)
          containerHeight.value = initialHeight
        }
      }

      if (height > lineHeight * maxLines) {
        setShowToggle(true)
      }
    },
    [contentHeight, containerHeight, lineHeight, maxLines]
  )

  const handleButtonLayout = useCallback((e: LayoutChangeEvent) => {
    setIsButtonLayoutReady(true)
  }, [])

  useEffect(() => {
    if (contentHeight === null) return

    if (isExpanded) {
      containerHeight.value = withTiming(contentHeight, motion.expressive)
    } else {
      containerHeight.value = withTiming(
        Math.min(contentHeight, lineHeight * maxLines),
        motion.expressive
      )
    }
  }, [
    isExpanded,
    contentHeight,
    containerHeight,
    motion.expressive,
    lineHeight,
    maxLines
  ])

  return (
    <Flex gap='m'>
      <Animated.View style={animatedContainerStyle}>
        <Box onLayout={handleContentLayout}>{children}</Box>
      </Animated.View>

      {showToggle && (
        <Flex
          ref={toggleButtonRef}
          onLayout={handleButtonLayout}
          style={{ minHeight: spacing.xl }}
        >
          <PlainButton
            iconRight={isExpanded ? IconCaretUp : IconCaretDown}
            onPress={toggleExpanded}
            style={{ alignSelf: 'flex-start' }}
          >
            {isExpanded ? messages.seeLess : messages.seeMore}
          </PlainButton>
        </Flex>
      )}
    </Flex>
  )
}
