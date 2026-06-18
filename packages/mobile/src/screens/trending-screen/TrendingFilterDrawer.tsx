import { useCallback, useMemo, useState } from 'react'

import { usePopularGenres } from '@audius/common/api'
import {
  modalsActions,
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import {
  ALL_GENRES,
  getTrendingGenreSuggestions,
  toTrendingGenreValue
} from '@audius/common/utils'
import {
  FlatList,
  Keyboard,
  Pressable,
  TouchableOpacity,
  View
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Divider,
  Flex,
  IconCaretLeft,
  Text,
  TextInput
} from '@audius/harmony-native'
import { RadioButton, Text as AppText } from 'app/components/core'
import { AppDrawer, useDrawerState } from 'app/components/drawer'
import { makeStyles } from 'app/styles'

const TRENDING_FILTER_MODAL = 'TrendingFilter' as const

const { setVisibility } = modalsActions
const { setTrendingGenre } = trendingPageActions
const { getTrendingGenre } = trendingPageSelectors

export const MODAL_NAME = 'TrendingGenreSelection'

const messages = {
  title: 'Pick a Genre',
  all: 'All Genres',
  searchPlaceholder: 'Search Genres',
  selected: 'Selected'
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    flex: 1
  },
  searchContainer: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    paddingBottom: spacing(4)
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(4)
  },
  genreRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  radio: {
    marginRight: spacing(4)
  },
  genreLabel: {
    flex: 1,
    textAlign: 'left',
    fontFamily: typography.fontByWeight.medium
  },
  selectedLabel: {
    fontFamily: typography.fontByWeight.demiBold,
    color: palette.secondary
  }
}))

export const TrendingFilterDrawer = () => {
  const styles = useStyles()
  const [searchValue, setSearchValue] = useState('')
  const trendingGenre = useSelector(getTrendingGenre) ?? ALL_GENRES
  const { onClose } = useDrawerState(MODAL_NAME)
  const dispatch = useDispatch()
  const { data: genreSuggestions = [] } = usePopularGenres()

  const handleBack = useCallback(() => {
    dispatch(setVisibility({ modal: MODAL_NAME, visible: false }))
    dispatch(setVisibility({ modal: TRENDING_FILTER_MODAL, visible: true }))
  }, [dispatch])

  const GenreDrawerHeader = useCallback(
    (_props: { onClose: () => void }) => (
      <Flex
        direction='row'
        alignItems='center'
        justifyContent='center'
        ph='xl'
        pv='s'
        style={{ minHeight: 48 }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconCaretLeft size='m' color='subdued' />
        </TouchableOpacity>
        <AppText fontSize='xl' weight='heavy' textTransform='uppercase'>
          {messages.title}
        </AppText>
      </Flex>
    ),
    [handleBack]
  )

  const genres = useMemo(() => {
    // Show the top popular genres by default; while searching, match across the
    // full set so long-tail genres remain discoverable.
    const filtered = getTrendingGenreSuggestions(
      genreSuggestions,
      searchValue
    ).map((genre) => genre.label)
    const query = searchValue.trim().toLowerCase()
    const includeAllGenres = !query || ALL_GENRES.toLowerCase().includes(query)
    return includeAllGenres ? [ALL_GENRES, ...filtered] : filtered
  }, [genreSuggestions, searchValue])

  const handleSelect = useCallback(
    (genre: string) => {
      dispatch(setTrendingGenre(toTrendingGenreValue(genre)))
      Keyboard.dismiss()
      onClose()
    },
    [dispatch, onClose]
  )

  return (
    <AppDrawer
      modalName={MODAL_NAME}
      isFullscreen
      isGestureSupported={false}
      drawerHeader={GenreDrawerHeader}
      onClose={handleBack}
    >
      <View style={styles.root}>
        <Flex style={styles.searchContainer}>
          <TextInput
            label={messages.searchPlaceholder}
            hideLabel
            placeholder={messages.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.nativeEvent.text)}
            returnKeyType='search'
            inputStyle={{ textAlign: 'left' }}
          />
        </Flex>
        <FlatList
          keyboardShouldPersistTaps='handled'
          data={genres}
          ItemSeparatorComponent={Divider}
          renderItem={({ item: genre }) => {
            const isSelected =
              genre === ALL_GENRES
                ? trendingGenre === ALL_GENRES
                : toTrendingGenreValue(genre) === trendingGenre

            return (
              <Pressable onPress={() => handleSelect(genre)}>
                <View style={styles.genreRow}>
                  <View style={styles.genreRowContent}>
                    <RadioButton checked={isSelected} style={styles.radio} />
                    <Text
                      variant='body'
                      style={[
                        styles.genreLabel,
                        isSelected && styles.selectedLabel
                      ]}
                    >
                      {genre}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Text variant='body' color='accent'>
                      {messages.selected}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )
          }}
        />
      </View>
    </AppDrawer>
  )
}
