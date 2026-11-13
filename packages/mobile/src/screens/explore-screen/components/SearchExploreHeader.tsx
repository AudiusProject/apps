import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { LayoutChangeEvent, ScrollView } from 'react-native'
import { Keyboard, StyleSheet, TextInput, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDebounce } from 'react-use'

import {
  Flex,
  IconButton,
  IconCloseAlt,
  IconSearch,
  useTheme
} from '@audius/harmony-native'
import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { useDrawer } from 'app/hooks/useDrawer'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AccountPictureHeader } from 'app/screens/app-screen/AccountPictureHeader'
import {
  useCompactProgressAt,
  useGlassScrollY,
  useSetRootHeaderHeight
} from 'app/screens/app-screen/GlassChromeContext'
import {
  EDGE_FADE_FROM_OPACITY,
  EDGE_FADE_TAIL,
  GlassEdgeFade
} from 'app/screens/app-screen/GlassEdgeFade'
import { SearchCategoriesAndFilters } from 'app/screens/search-screen/SearchCategoriesAndFilters'

import { useSearchQuery } from '../../search-screen/searchState'
import { useExploreRoute } from '../hooks'

/** Scroll distance over which the status bar fade comes in. */
const EDGE_FADE_DISTANCE = 24

const SEARCH_FIELD_HEIGHT = 40

type SearchExploreHeaderProps = {
  scrollRef?: React.RefObject<ScrollView | null>
}

export const SearchExploreHeader = (props: SearchExploreHeaderProps) => {
  const { scrollRef } = props
  const { spacing, color, typography } = useTheme()
  const floating = useSharedValue(1)
  const { params } = useExploreRoute<'SearchExplore'>()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const navigation = useNavigation()
  const isFocused = useIsFocused()
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const textInputRef = useRef<TextInput>(null)

  const [query, setQuery] = useSearchQuery()
  const [inputValue, setInputValue] = useState(query)

  useDebounce(() => setQuery(inputValue), 400, [inputValue])

  useEffect(() => {
    if (inputValue !== query) setInputValue(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Focus the search input when navigated here with autoFocus: true (e.g.,
  // user taps the search icon). Use a plain useEffect — NOT useFocusEffect —
  // so this fires only when the param transitions, not on every screen focus.
  // Without this, the keyboard re-appears whenever the app returns from
  // background while explore is the active tab. Consume the param by setting
  // it back to false so a subsequent search-icon tap can re-trigger focus.
  //
  // Gate on isFocused so a stale autoFocus param can't summon the keyboard
  // while the explore tab isn't the active tab — this is what caused the
  // brief keyboard flash on cold launch when the explore screen mounted
  // off-screen with autoFocus: true already on its route.
  useEffect(() => {
    if (params?.autoFocus === true && isFocused) {
      textInputRef.current?.focus()
      // @ts-expect-error: setParams is not typed on the generic NavigationProp, but is available on StackNavigationProp
      navigation.setParams?.({ autoFocus: false })
    }
  }, [params?.autoFocus, navigation, isFocused])

  const handleOpenLeftNavDrawer = useCallback(() => {
    if (isNowPlayingDrawerOpen) return
    drawerHelpers?.openDrawer()
  }, [drawerHelpers, isNowPlayingDrawerOpen])

  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setQuery('')
    scrollRef?.current?.scrollTo?.({ y: 0, animated: false })
    Keyboard.dismiss()
  }, [setQuery, scrollRef])

  const handleSearchInputChange = useCallback(
    (text: string) => {
      setInputValue(text)
      if (text === '') {
        scrollRef?.current?.scrollTo?.({ y: 0, animated: false })
      }
    },
    [scrollRef]
  )

  const { top } = useSafeAreaInsets()
  const setHeaderHeight = useSetRootHeaderHeight()
  const scrollY = useGlassScrollY()
  const [categoriesHeight, setCategoriesHeight] = useState(0)
  const pinnedProgress = useCompactProgressAt(categoriesHeight)

  // The search row only follows the overscroll rubber band.
  const searchRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(scrollY.value, 0) }]
  }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - pinnedProgress.value
  }))
  const categoriesStyle = useAnimatedStyle(() => ({
    opacity: 1 - pinnedProgress.value,
    transform: [{ translateY: -Math.min(scrollY.value, categoriesHeight) }]
  }))
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, EDGE_FADE_DISTANCE],
      [0, 1],
      'clamp'
    )
  }))

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setHeaderHeight(event.nativeEvent.layout.height)
    },
    [setHeaderHeight]
  )

  const handleCategoriesLayout = useCallback((event: LayoutChangeEvent) => {
    setCategoriesHeight(event.nativeEvent.layout.height)
  }, [])

  return (
    <View pointerEvents='box-none' style={styles.root} onLayout={handleLayout}>
      {/*
        Avatar + search field stay pinned. The categories scroll away behind
        them, then the row's fill fades so the field floats over the content.
        While searching the list is swapped out and the chrome scroll resets,
        so the categories stay put.
      */}
      <Animated.View style={[styles.searchRow, searchRowStyle]}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: color.background.white },
            backdropStyle
          ]}
        />
        <Flex
          direction='row'
          alignItems='center'
          gap='m'
          ph='l'
          pt={top + spacing.m}
          pb='m'
        >
          <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
          <GlassCapsule
            height={SEARCH_FIELD_HEIGHT}
            floatProgress={floating}
            tintColor={`${color.neutral.n100.slice(0, 7)}CC`}
            style={styles.field}
          >
            <Flex
              flex={1}
              direction='row'
              alignItems='center'
              gap='s'
              pl='l'
              pr='m'
            >
              <IconSearch size='m' color='subdued' />
              <TextInput
                ref={textInputRef}
                accessibilityLabel='Search'
                autoCorrect={false}
                returnKeyType='search'
                placeholder={messages.searchPlaceholder}
                placeholderTextColor={color.text.subdued}
                selectionColor={color.secondary.secondary}
                onChangeText={handleSearchInputChange}
                value={inputValue}
                style={[
                  styles.input,
                  {
                    color: color.text.default,
                    fontFamily: typography.fontByWeight.medium,
                    fontSize: typography.size.m
                  }
                ]}
              />
              {inputValue ? (
                <IconButton
                  icon={IconCloseAlt}
                  color='subdued'
                  size='s'
                  aria-label='Clear search'
                  onPress={handleClearSearch}
                  hitSlop={10}
                />
              ) : null}
            </Flex>
          </GlassCapsule>
        </Flex>
      </Animated.View>
      <Animated.View style={categoriesStyle} onLayout={handleCategoriesLayout}>
        <Flex
          backgroundColor='white'
          style={{
            borderBottomWidth: 1,
            borderBottomColor: color.border.strong
          }}
        >
          <SearchCategoriesAndFilters />
        </Flex>
      </Animated.View>
      <GlassEdgeFade
        height={top + EDGE_FADE_TAIL}
        fromOpacity={EDGE_FADE_FROM_OPACITY}
        toOpacity={0}
        style={fadeStyle}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // Extends above the row to fill the gap when overscroll pulls it down.
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -1000,
    bottom: 0
  },
  searchRow: {
    zIndex: 1
  },
  field: {
    flex: 1,
    // GlassCapsule insets itself from the screen edges while floating.
    marginHorizontal: 0
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0
  },
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2
  }
})
