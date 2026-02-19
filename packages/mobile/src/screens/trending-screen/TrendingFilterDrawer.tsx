import { useCallback, useMemo, useState } from 'react'

import {
  trendingPageLineupActions,
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import {
  Genre,
  ELECTRONIC_PREFIX,
  ELECTRONIC_SUBGENRES,
  GENRES
} from '@audius/common/utils'
import { FlatList, Keyboard, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Button } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'
import { AppDrawer, useDrawerState } from 'app/components/drawer'
import { makeStyles } from 'app/styles'
const { setTrendingGenre } = trendingPageActions
const { getTrendingGenre } = trendingPageSelectors
const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
  trendingPageLineupActions

export const MODAL_NAME = 'TrendingGenreSelection'

const messages = {
  title: 'Pick a Genre',
  all: 'All Genres',
  searchPlaceholder: 'Search Genres'
}

const trendingGenres = [Genre.ALL, ...GENRES]

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    paddingHorizontal: spacing(3),
    flex: 1
  },
  search: {
    marginBottom: spacing(2)
  },
  genreButton: {
    marginVertical: spacing(1)
  }
}))

export const TrendingFilterDrawer = () => {
  const styles = useStyles()
  const [searchValue, setSearchValue] = useState('')
  const trendingGenre = useSelector(getTrendingGenre) ?? Genre.ALL
  const { onClose } = useDrawerState(MODAL_NAME)
  const dispatch = useDispatch()

  const genres = useMemo(() => {
    const searchValueLower = searchValue.toLowerCase()
    return trendingGenres.filter((genre) =>
      genre.toLowerCase().includes(searchValueLower)
    )
  }, [searchValue])

  const handleSelect = useCallback(
    (genre: string) => {
      const trimmedGenre =
        genre === Genre.ALL
          ? null
          : (genre.replace(ELECTRONIC_PREFIX, '') as Genre)

      const handlePress = () => {
        dispatch(setTrendingGenre(trimmedGenre))
        dispatch(trendingWeekActions.reset())
        dispatch(trendingMonthActions.reset())
        dispatch(trendingAllTimeActions.reset())
        Keyboard.dismiss()
        onClose()
      }

      return handlePress
    },
    [dispatch, onClose]
  )

  return (
    <AppDrawer
      modalName={MODAL_NAME}
      isFullscreen
      title={messages.title}
      isGestureSupported={false}
    >
      <View style={styles.root}>
        <TextInput
          placeholder={messages.searchPlaceholder}
          style={styles.search}
          value={searchValue}
          onChangeText={setSearchValue}
          returnKeyType='search'
        />
        <FlatList
          keyboardShouldPersistTaps='handled'
          data={genres}
          renderItem={({ item: genre }) => {
            const isSelected =
              ELECTRONIC_SUBGENRES[genre] === trendingGenre ||
              genre === trendingGenre

            return (
              <Button
                fullWidth
                variant={isSelected ? 'primary' : 'secondary'}
                style={styles.genreButton}
                onPress={handleSelect(genre)}
              >
                {genre}
              </Button>
            )
          }}
        />
      </View>
    </AppDrawer>
  )
}
