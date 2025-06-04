import { useState, useEffect } from 'react'

import type { SearchCategory } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { useRoute } from 'app/hooks/useRoute'
import { ExploreScreen } from 'app/screens/explore-screen'
import {
  CHILL_PLAYLISTS,
  INTENSE_PLAYLISTS,
  INTIMATE_PLAYLISTS,
  PROVOKING_PLAYLISTS,
  UPBEAT_PLAYLISTS
} from 'app/screens/explore-screen/collections'
import {
  BEST_NEW_RELEASES,
  FEELING_LUCKY,
  HEAVY_ROTATION,
  MOST_LOVED,
  REMIXABLES,
  UNDER_THE_RADAR
} from 'app/screens/explore-screen/smartCollections'
import {
  LetThemDJScreen,
  PremiumTracksScreen,
  TopAlbumsScreen,
  TrendingPlaylistsScreen,
  TrendingUndergroundScreen
} from 'app/screens/explore-screen/tabs/ForYouTab'
import { MoodCollectionScreen } from 'app/screens/mood-collection-screen/MoodCollectionScreen'
import { SmartCollectionScreen } from 'app/screens/smart-collection-screen/SmartCollectionScreen'

import { SearchExploreScreen } from '../explore-screen/SearchExploreScreen'
import { SearchContext } from '../search-screen/searchState'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type ExploreTabScreenParamList = AppTabScreenParamList & {
  Explore: undefined
  // Smart Collection Screens
  UnderTheRadar: undefined
  MostLoved: undefined
  FeelingLucky: undefined
  HeavyRotation: undefined
  BestNewReleases: undefined
  Remixables: undefined
  // Collection Screens
  PremiumTracks: undefined
  TrendingUnderground: undefined
  LetThemDJ: undefined
  TopAlbums: undefined
  TrendingPlaylists: undefined
  // Mood Screens
  ChillPlaylists: undefined
  IntensePlaylists: undefined
  IntimatePlaylists: undefined
  UpbeatPlaylists: undefined
  ProvokingPlaylists: undefined
}

const moodCollections = [
  CHILL_PLAYLISTS,
  INTENSE_PLAYLISTS,
  INTIMATE_PLAYLISTS,
  PROVOKING_PLAYLISTS,
  UPBEAT_PLAYLISTS
]

const smartCollections = [
  UNDER_THE_RADAR,
  BEST_NEW_RELEASES,
  REMIXABLES,
  MOST_LOVED,
  FEELING_LUCKY,
  HEAVY_ROTATION
]

export const ExploreTabScreen =
  createAppTabScreenStack<ExploreTabScreenParamList>((Stack) => {
    // const { isEnabled: isSearchExploreEnabled, isLoaded } = useFeatureFlag(
    //   FeatureFlags.SEARCH_EXPLORE_MOBILE
    // )
    // console.log(
    //   'asdf isSearchExploreEnabled: ',
    //   isSearchExploreEnabled,
    //   isLoaded
    // )
    // // if (true) {
    // return (
    //   // <SearchContext.Provider
    //   //   value={{
    //   //     autoFocus,
    //   //     setAutoFocus,
    //   //     query,
    //   //     setQuery,
    //   //     category,
    //   //     setCategory,
    //   //     filters,
    //   //     setFilters,
    //   //     bpmType,
    //   //     setBpmType,
    //   //     active: true
    //   //   }}
    //   // >
    //   <Stack.Screen name='SearchExplore' component={SearchExploreScreen} />
    //   // </SearchContext.Provider>
    // )
    // // }

    return (
      <>
        <Stack.Screen name='Explore' component={ExploreScreen} />
        <Stack.Screen name='PremiumTracks' component={PremiumTracksScreen} />
        <Stack.Screen name='LetThemDJ' component={LetThemDJScreen} />
        <Stack.Screen name='TopAlbums' component={TopAlbumsScreen} />
        <Stack.Screen
          name='TrendingPlaylists'
          component={TrendingPlaylistsScreen}
        />
        <Stack.Screen
          name='TrendingUnderground'
          component={TrendingUndergroundScreen}
        />
        {smartCollections.map((collection) => (
          <Stack.Screen name={collection.screen} key={collection.screen}>
            {() => <SmartCollectionScreen smartCollection={collection} />}
          </Stack.Screen>
        ))}
        {moodCollections.map((collection) => (
          <Stack.Screen name={collection.screen} key={collection.screen}>
            {() => <MoodCollectionScreen collection={collection} />}
          </Stack.Screen>
        ))}
      </>
    )
  })
