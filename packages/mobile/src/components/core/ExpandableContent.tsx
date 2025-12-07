import { useCallback, useState, useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

import type { View } from 'react-native'
import { Platform } from 'react-native'
import type {
  LayoutChangeEvent,
  ScrollView,
  FlatList
} from 'react-native/types'
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

  // Track height of content for animation
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
          // ScrollView
          scrollRef.current.scrollTo({
            y: pageY - height / 2,
            animated: true
          })
        } else if ('scrollToOffset' in scrollRef.current) {
          // FlatList
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
          // Try again with increasing delays
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
      // On Android, use measureInWindow with retry logic
      requestAnimationFrame(() => {
        tryMeasureAndroid()
      })
    } else {
      // On iOS, use measure which provides page-relative coordinates
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

      // If we're collapsing, scroll to center the toggle button
      if (!newIsExpanded) {
        measureAndScroll()
      }

      return newIsExpanded
    })
  }, [measureAndScroll])

  // Handle layout measurement
  const handleContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height

      // Store content height for calculations
      if (contentHeight === null || height > contentHeight) {
        setContentHeight(height)

        // If first measure, set container height
        if (containerHeight.value === null) {
          const initialHeight = Math.min(height, lineHeight * maxLines)
          containerHeight.value = initialHeight
        }
      }

      // Show toggle if content exceeds max lines
      if (height > lineHeight * maxLines) {
        setShowToggle(true)
      }
    },
    [contentHeight, containerHeight, lineHeight, maxLines]
  )

  // Wait for the button to be laid out before measuring - needed for Android
  const handleButtonLayout = useCallback((e: LayoutChangeEvent) => {
    setIsButtonLayoutReady(true)
  }, [])

  // Update height when expanded state changes
  useEffect(() => {
    if (contentHeight === null) return

    if (isExpanded) {
      // Expand to full content height
      containerHeight.value = withTiming(contentHeight, motion.expressive)
    } else {
      // Collapse to max lines height
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
