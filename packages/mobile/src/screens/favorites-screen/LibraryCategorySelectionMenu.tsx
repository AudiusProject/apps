import { useCallback } from 'react'

import type { LibraryCategoryType } from '@audius/common/store'
import {
  savedPageActions,
  savedPageSelectors,
  LibraryCategory,
  SavedPageTabs
} from '@audius/common/store'
import { useNavigationState } from '@react-navigation/native'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { SelectablePill } from '@audius/harmony-native'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { makeStyles } from 'app/styles'

const { getCategory } = savedPageSelectors
const { setSelectedCategory } = savedPageActions

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    flexGrow: 1,
    flexDirection: 'row',
    marginTop: spacing(3)
  },
  scrollContainer: {
    columnGap: spacing(2)
  }
}))

const ALL_CATEGORIES = [
  {
    label: 'All',
    value: LibraryCategory.All
  },
  {
    label: 'Favorites',
    value: LibraryCategory.Favorite
  },
  {
    label: 'Reposts',
    value: LibraryCategory.Repost
  },
  {
    label: 'Premium',
    value: LibraryCategory.Purchase
  }
]

const CATEGORIES_WITHOUT_PURCHASED = ALL_CATEGORIES.slice(0, -1)

type LibraryTabRouteName = 'albums' | 'tracks' | 'playlists'
const ROUTE_NAME_TO_TAB = {
  albums: SavedPageTabs.ALBUMS,
  tracks: SavedPageTabs.TRACKS,
  playlists: SavedPageTabs.PLAYLISTS
} as Record<LibraryTabRouteName, SavedPageTabs>

export const LibraryCategorySelectionMenu = () => {
  const styles = useStyles()
  const dispatch = useDispatch()

  const currentTab = useNavigationState((state) => {
    if (state.routes?.[0].name !== 'Library') {
      return SavedPageTabs.TRACKS
    }
    const tabRouteNames = state.routes[0].state?.routeNames
    if (!tabRouteNames) {
      return SavedPageTabs.TRACKS
    }

    const index = state.routes[0].state?.index
    if (index === undefined) {
      return SavedPageTabs.TRACKS
    }

    const routeName = tabRouteNames[index]
    if (!routeName) {
      return SavedPageTabs.TRACKS
    }

    return ROUTE_NAME_TO_TAB[routeName] || SavedPageTabs.TRACKS
  }) as SavedPageTabs

  const selectedCategory = useSelector((state) =>
    getCategory(state, {
      currentTab
    })
  )

  const handleChange = useCallback(
    (category: string) => {
      dispatch(
        setSelectedCategory({
          currentTab,
          category: category as LibraryCategoryType
        })
      )
    },
    [currentTab, dispatch]
  )

  const isUSDCPurchasesEnabled = useIsUSDCEnabled()
  const categories =
    isUSDCPurchasesEnabled &&
    (currentTab === SavedPageTabs.TRACKS || currentTab === SavedPageTabs.ALBUMS)
      ? ALL_CATEGORIES
      : CATEGORIES_WITHOUT_PURCHASED

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        accessibilityRole='radiogroup'
        contentContainerStyle={styles.scrollContainer}
        alwaysBounceHorizontal={false}
      >
        {categories.map((category) => {
          const { value, label } = category
          return (
            <SelectablePill
              key={value}
              type='radio'
              label={label}
              value={value}
              onChange={handleChange}
              isSelected={selectedCategory === value}
            />
          )
        })}
      </ScrollView>
    </View>
  )
}
