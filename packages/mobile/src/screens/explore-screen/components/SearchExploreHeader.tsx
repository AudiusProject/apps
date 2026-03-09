import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { exploreMessages as messages } from '@audius/common/messages'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { ScrollView } from 'react-native'
import { Keyboard } from 'react-native'
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
import { SearchCategoriesAndFilters } from 'app/screens/search-screen/SearchCategoriesAndFilters'

import { useSearchQuery } from '../../search-screen/searchState'
import { useExploreRoute } from '../hooks'

type SearchExploreHeaderProps = {
  scrollRef?: React.RefObject<ScrollView | null>
}

export const SearchExploreHeader = (props: SearchExploreHeaderProps) => {
  const { scrollRef } = props
  const { spacing, color } = useTheme()
  const { params } = useExploreRoute<'SearchExplore'>()
  const { drawerHelpers } = useContext(AppDrawerContext)
  const navigation = useNavigation()
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const textInputRef = useRef<any>(null)

  const [query, setQuery] = useSearchQuery()
  const [inputValue, setInputValue] = useState(query)

  useDebounce(() => setQuery(inputValue), 400, [inputValue])

  useEffect(() => {
    if (inputValue !== query) setInputValue(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useFocusEffect(
    useCallback(() => {
      if (params?.autoFocus === true && textInputRef.current) {
        textInputRef.current?.focus()
      }
    }, [params?.autoFocus])
  )

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

  return (
    <>
      <Flex
        direction='row'
        alignItems='center'
        gap='m'
        backgroundColor='white'
        ph='l'
        pv='m'
        pt={top + spacing.m}
        pb='m'
        style={{ zIndex: 2 }}
      >
        <AccountPictureHeader onPress={handleOpenLeftNavDrawer} />
        <Flex flex={1}>
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
          zIndex: 1,
          borderBottomWidth: 1,
          borderBottomColor: color.border.strong
        }}
      >
        <SearchCategoriesAndFilters />
      </Flex>
    </>
  )
}
