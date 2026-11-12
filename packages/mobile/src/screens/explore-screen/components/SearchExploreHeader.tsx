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
import { Keyboard, StyleSheet, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDebounce } from 'react-use'

import {
  Flex,
  IconButton,
  IconCloseAlt,
  IconSearch,
  TextInput,
  TextInputSize,
  useTheme
} from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AccountPictureHeader } from 'app/screens/app-screen/AccountPictureHeader'
import { CompactTitlePill } from 'app/screens/app-screen/CompactHeader'
import {
  useCompactTitleProgress,
  useGlassScrollY,
  useHeaderScrollOffset,
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

type SearchExploreHeaderProps = {
  scrollRef?: React.RefObject<ScrollView | null>
}

export const SearchExploreHeader = (props: SearchExploreHeaderProps) => {
  const { scrollRef } = props
  const { spacing, color } = useTheme()
  const { params } = useExploreRoute<'SearchExplore'>()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const navigation = useNavigation()
  const isFocused = useIsFocused()
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const textInputRef = useRef<any>(null)

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
      // The field may have scrolled away with the header.
      scrollRef?.current?.scrollTo?.({ y: 0, animated: false })
      textInputRef.current?.focus()
      // @ts-expect-error: setParams is not typed on the generic NavigationProp, but is available on StackNavigationProp
      navigation.setParams?.({ autoFocus: false })
    }
  }, [params?.autoFocus, navigation, isFocused, scrollRef])

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
  const scrollOffset = useHeaderScrollOffset()
  const compactProgress = useCompactTitleProgress()

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -scrollOffset.value }]
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

  return (
    <View pointerEvents='box-none' style={styles.root}>
      {/*
        The classic header: avatar + search field, then categories. It
        scrolls away with the explore content and contracts to a title pill.
        While searching the list is swapped out and the chrome scroll resets,
        so it stays put.
      */}
      <Animated.View style={scrollStyle} onLayout={handleLayout}>
        <Flex backgroundColor='white' style={styles.overscrollFill} />
        <Flex
          direction='row'
          alignItems='center'
          gap='m'
          backgroundColor='white'
          ph='l'
          pt={top + spacing.m}
          pb='m'
        >
          <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
          <Flex flex={1}>
            <TextInput
              ref={textInputRef}
              label='Search'
              autoCorrect={false}
              placeholder={messages.searchPlaceholder}
              size={TextInputSize.SMALL}
              startIcon={IconSearch}
              onChangeText={handleSearchInputChange}
              value={inputValue}
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
          </Flex>
        </Flex>
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
      <CompactTitlePill
        title={messages.explore}
        progress={compactProgress}
        leading={<IconSearch size='s' color='default' />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // Fills the gap above the header when overscroll pulls it down.
  overscrollFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: 1000
  },
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2
  }
})
