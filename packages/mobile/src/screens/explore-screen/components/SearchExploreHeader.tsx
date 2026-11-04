import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { ScrollView } from 'react-native'
import { Keyboard } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
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
import { GlassCapsule } from 'app/components/core/Screen/GlassCapsule'
import { useDrawer } from 'app/hooks/useDrawer'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AccountPictureHeader } from 'app/screens/app-screen/AccountPictureHeader'
import { SearchCategoriesAndFilters } from 'app/screens/search-screen/SearchCategoriesAndFilters'

import { useSearchQuery } from '../../search-screen/searchState'
import { useExploreRoute } from '../hooks'

const SEARCH_CAPSULE_HEIGHT = 52

type SearchExploreHeaderProps = {
  scrollRef?: React.RefObject<ScrollView | null>
}

export const SearchExploreHeader = (props: SearchExploreHeaderProps) => {
  const { scrollRef } = props
  const { spacing, cornerRadius } = useTheme()
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
  const flat = useSharedValue(0)

  return (
    <>
      {/*
        Same capsule as the other tabs' headers, with the search field in
        place of the title. Explore's content scrolls below it rather than
        under it, so it stays flat and never hides.
      */}
      <Flex pt={top + spacing.xs} pb='s' style={{ zIndex: 2 }}>
        <GlassCapsule height={SEARCH_CAPSULE_HEIGHT} floatProgress={flat}>
          <Flex
            flex={1}
            direction='row'
            alignItems='center'
            gap='m'
            pl='s'
            pr='s'
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
                inputStyle={{ borderRadius: cornerRadius['2xl'] }}
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
        </GlassCapsule>
      </Flex>
      <Flex style={{ zIndex: 1 }}>
        <SearchCategoriesAndFilters />
      </Flex>
    </>
  )
}
