import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { ScrollView } from 'react-native'
import { ImageBackground, Keyboard } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, {
  interpolate,
  useAnimatedStyle,
  interpolateColor,
  Extrapolation,
  withTiming,
  useDerivedValue
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDebounce } from 'react-use'

import {
  Flex,
  IconButton,
  IconCloseAlt,
  IconSearch,
  Text,
  TextInput,
  TextInputSize,
  useTheme
} from '@audius/harmony-native'
import imageSearchHeaderBackground from 'app/assets/images/imageSearchHeaderBackground.webp'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AccountPictureHeader } from 'app/screens/app-screen/AccountPictureHeader'
import { SearchCategoriesAndFilters } from 'app/screens/search-screen/SearchCategoriesAndFilters'

import {
  useSearchCategory,
  useSearchFilters,
  useSearchQuery
} from '../../search-screen/searchState'
import { SCROLL_FACTOR } from '../SearchExploreScreen'
import { useExploreRoute } from '../hooks'

const AnimatedFlex = Animated.createAnimatedComponent(Flex)
const AnimatedText = Animated.createAnimatedComponent(Text)

// Animation parameters
const HEADER_SLIDE_HEIGHT = 46
const HEADER_COLLAPSE_THRESHOLD = 50

type SearchExploreHeaderProps = {
  filterTranslateY: SharedValue<number>
  scrollY: SharedValue<number>
  scrollRef: React.RefObject<ScrollView | null>
}

export const SearchExploreHeader = (props: SearchExploreHeaderProps) => {
  const { filterTranslateY, scrollY, scrollRef } = props
  const { spacing, color, motion } = useTheme()
  const { params } = useExploreRoute<'SearchExplore'>()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const navigation = useNavigation()
  const textInputRef = useRef<any>(null)
  const [isFocused, setIsFocused] = useState(!!params?.autoFocus)
  const { top } = useSafeAreaInsets()

  // Get state from context
  const [query, setQuery] = useSearchQuery()
  const [inputValue, setInputValue] = useState(query)
  useDebounce(() => setQuery(inputValue), 400, [inputValue])

  // Keep input in sync with query changes (e.g., from deeplinks/route params)
  useEffect(() => {
    if (inputValue !== query) setInputValue(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const [category] = useSearchCategory()
  const [filters] = useSearchFilters()

  const hasAnyFilter = Object.values(filters).some(
    (value) => value !== undefined
  )

  const { isEnabled: isCollapsedHeaderEnabled } = useFeatureFlag(
    FeatureFlags.COLLAPSED_EXPLORE_HEADER
  )

  const shouldCollapse =
    isCollapsedHeaderEnabled ||
    isFocused ||
    !!inputValue ||
    category !== 'all' ||
    hasAnyFilter ||
    params?.autoFocus

  // Focus the input when autoFocus is true and screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (params?.autoFocus === true && textInputRef.current) {
        textInputRef.current?.focus()
      }
    }, [params?.autoFocus])
  )

  // When the user dismisses the keyboard, we need to set autoFocus to false
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (params?.autoFocus === true) {
          // @ts-expect-error: setParams is not typed on the generic NavigationProp, but is available on StackNavigationProp
          navigation.setParams?.({ autoFocus: false })
        }
      }
    )

    return () => keyboardDidHideListener?.remove()
  }, [navigation, params?.autoFocus])

  // Create derived values for better performance
  const isAtTop = useDerivedValue(() => {
    return scrollY.value === 0
  })

  const handleOpenLeftNavDrawer = useCallback(() => {
    drawerHelpers?.openDrawer()
  }, [drawerHelpers])

  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setQuery('')
    scrollRef.current?.scrollTo({
      y: 0,
      animated: false
    })
    Keyboard.dismiss()
  }, [setInputValue, setQuery, scrollRef])

  const handleSearchInputChange = useCallback(
    (text: string) => {
      setInputValue(text)
      if (text === '') {
        scrollRef.current?.scrollTo?.({ y: 0, animated: false })
      }
    },
    [setInputValue, scrollRef]
  )

  // Header text fades out when collapsing
  // Height shrinks to collapse rows for avatar + input
  const headerTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shouldCollapse
      ? withTiming(0)
      : isAtTop.value
        ? withTiming(1, motion.calm)
        : interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [1, 0],
            Extrapolation.CLAMP
          ),
    height: shouldCollapse
      ? withTiming(0, motion.calm)
      : isAtTop.value
        ? withTiming(34, motion.calm)
        : interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [34, 0],
            Extrapolation.CLAMP
          ),
    zIndex: -1
  }))

  const descriptionTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shouldCollapse
      ? withTiming(0)
      : isAtTop.value
        ? withTiming(1, motion.calm)
        : interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [1, 0],
            Extrapolation.CLAMP
          ),
    height: shouldCollapse
      ? withTiming(0, motion.calm)
      : isAtTop.value
        ? withTiming(50, motion.calm)
        : interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [50, 0],
            Extrapolation.CLAMP
          ),
    zIndex: -1
  }))

  const inputAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scale: shouldCollapse
            ? withTiming(0.83, motion.calm)
            : isAtTop.value
              ? withTiming(1, motion.calm)
              : interpolate(
                  scrollY.value,
                  [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
                  [1, 0.83],
                  Extrapolation.CLAMP
                )
        },
        {
          translateX: shouldCollapse
            ? withTiming(30, motion.calm)
            : isAtTop.value
              ? withTiming(0)
              : interpolate(
                  scrollY.value,
                  [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
                  [0, 30],
                  Extrapolation.CLAMP
                )
        }
      ]
    }),
    [shouldCollapse]
  )

  // Header slides up to collapse
  const headerSlideAnimatedStyle = useAnimatedStyle(() => ({
    marginTop: shouldCollapse
      ? withTiming(-HEADER_SLIDE_HEIGHT, motion.calm)
      : isAtTop.value
        ? withTiming(0, motion.calm)
        : interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [0, -HEADER_SLIDE_HEIGHT],
            Extrapolation.CLAMP
          )
  }))

  // Header padding and gap shrink when collapsing
  const headerPaddingShrinkStyle = useAnimatedStyle(
    () => ({
      paddingVertical: shouldCollapse
        ? withTiming(spacing.s, motion.calm)
        : isAtTop.value
          ? withTiming(spacing.l, motion.calm)
          : interpolate(
              scrollY.value,
              [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
              [spacing.l, spacing.s],
              Extrapolation.CLAMP
            ),
      gap: shouldCollapse
        ? withTiming(0, motion.calm)
        : isAtTop.value
          ? withTiming(spacing.l, motion.calm)
          : interpolate(
              scrollY.value,
              [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
              [spacing.l, 0],
              Extrapolation.CLAMP
            )
    }),
    [shouldCollapse]
  )

  // Filters slide up when header collapses
  // and hides when scrolling further down
  const filtersAnimatedStyle = useAnimatedStyle(() => ({
    marginTop:
      isAtTop.value || shouldCollapse
        ? withTiming(0, motion.calm)
        : filterTranslateY.value,
    backgroundColor:
      scrollY.value === 0
        ? withTiming(color.background.default, motion.calm)
        : interpolateColor(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [color.background.default, color.neutral.n25]
          ),
    borderColor: shouldCollapse
      ? withTiming(color.border.strong, motion.calm)
      : scrollY.value === 0
        ? withTiming(color.background.default, motion.calm)
        : interpolateColor(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
            [color.background.default, color.border.strong]
          )
  }))

  const animatedFilterPaddingVertical = useDerivedValue(() => {
    return shouldCollapse || isAtTop.value
      ? spacing.l
      : interpolate(
          scrollY.value,
          [0, HEADER_COLLAPSE_THRESHOLD * SCROLL_FACTOR],
          [spacing.l, spacing.m],
          Extrapolation.CLAMP
        )
  })

  return (
    <>
      <Flex
        style={{
          position: 'absolute',
          left: spacing.l,
          top,
          zIndex: 3
        }}
        w={spacing.unit10}
      >
        <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
      </Flex>
      <AnimatedFlex style={[{ zIndex: 2 }, headerSlideAnimatedStyle]}>
        <ImageBackground source={imageSearchHeaderBackground}>
          <AnimatedFlex pt='unit14' ph='l' style={headerPaddingShrinkStyle}>
            <Flex
              direction='row'
              gap='m'
              h={spacing.unit11}
              alignItems='center'
              style={{ marginLeft: spacing.unit10 + spacing.m }}
            >
              <AnimatedText
                variant='heading'
                color='staticWhite'
                style={headerTextAnimatedStyle}
              >
                {messages.explore}
              </AnimatedText>
            </Flex>
            <AnimatedText
              variant='title'
              color='staticWhite'
              style={[descriptionTextAnimatedStyle]}
            >
              {messages.description}
            </AnimatedText>
            <Animated.View style={inputAnimatedStyle}>
              <TextInput
                ref={textInputRef}
                label='Search'
                autoFocus={params?.autoFocus}
                autoCorrect={false}
                placeholder={messages.searchPlaceholder}
                size={TextInputSize.SMALL}
                startIcon={IconSearch}
                onChangeText={handleSearchInputChange}
                value={inputValue}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                endIcon={(props) =>
                  inputValue ? (
                    <IconButton
                      icon={IconCloseAlt}
                      color='subdued'
                      onPress={handleClearSearch}
                      hitSlop={10}
                      {...props}
                    />
                  ) : null
                }
              />
            </Animated.View>
          </AnimatedFlex>
        </ImageBackground>
      </AnimatedFlex>
      <AnimatedFlex
        style={[filtersAnimatedStyle, { zIndex: 1, borderBottomWidth: 1 }]}
      >
        <SearchCategoriesAndFilters
          animatedPaddingVertical={animatedFilterPaddingVertical}
        />
      </AnimatedFlex>
    </>
  )
}
