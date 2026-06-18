import { useState } from 'react'

import cn from 'classnames'

import SearchBar from 'components/search-bar/SearchBar'
import useDelayHandler from 'hooks/useDelayHandler'

import styles from './GenreSelectionList.module.css'

const GenreButton = ({
  title,
  onClick,
  isSelected,
  isMobile
}: {
  title: string
  onClick: () => void
  isSelected: boolean
  isMobile: boolean
}) => {
  return (
    <div
      className={cn(
        styles.genreButton,
        { [styles.selected]: isSelected },
        { [styles.isMobile]: isMobile }
      )}
      onClick={onClick}
    >
      {title}
    </div>
  )
}

type GenreSelectionListProps = {
  genres: string[]
  /**
   * Genres shown by default (no active search). When provided, `genres` is
   * treated as the searchable superset so the top genres display first while
   * long-tail genres remain discoverable via search.
   */
  topGenres?: string[]
  didSelectGenre: (genre: string | null) => void
  selectedGenre: string | null
  containerClassName?: string
  isMobile?: boolean
}

const DISMISS_DELAY_MS = 200

const messages = {
  title: 'Pick a Genre',
  all: 'All Genres',
  searchPlaceholder: 'Search Genres'
}

// A selectable list of genres. Used to filter
// trending on mobile and desktop.
const GenreSelectionList = ({
  genres,
  topGenres,
  didSelectGenre,
  selectedGenre,
  containerClassName,
  isMobile = false
}: GenreSelectionListProps) => {
  const [searchValue, setSearchValue] = useState('')

  const { delayedHandler, computedState } = useDelayHandler(
    DISMISS_DELAY_MS,
    didSelectGenre,
    { selectedGenre }
  )
  // Show the top genres by default; search across the full list so long-tail
  // genres remain discoverable.
  const sourceGenres = !searchValue.trim() && topGenres ? topGenres : genres
  const filteredGenreList = sourceGenres.filter((g) =>
    g.toLowerCase().includes(searchValue.toLowerCase())
  )
  const selectedIndex =
    computedState.selectedGenre === null
      ? -1
      : filteredGenreList.indexOf(computedState.selectedGenre)

  const genreList = filteredGenreList.map((g, i) => (
    <GenreButton
      title={g}
      onClick={() => {
        delayedHandler({ selectedGenre: g }, g)
      }}
      isSelected={selectedIndex === i}
      key={g}
      isMobile={isMobile}
    />
  ))

  // Special case the All Genres button
  if (messages.all.toLowerCase().includes(searchValue.toLowerCase())) {
    genreList.unshift(
      <GenreButton
        key={messages.all}
        title={messages.all}
        onClick={() => delayedHandler({ selectedGenre: null }, null)}
        isSelected={computedState.selectedGenre === null}
        isMobile={isMobile}
      />
    )
  }

  return (
    <div className={cn(styles.container, containerClassName)}>
      <div className={styles.genreContainer}>
        <SearchBar
          className={styles.searchBar}
          iconClassname={styles.searchIcon}
          open
          value={searchValue}
          onSearch={setSearchValue}
          onOpen={() => {}}
          onClose={() => {}}
          placeholder={messages.searchPlaceholder}
          shouldAutoFocus={!isMobile}
        />
        {genreList}
      </div>
    </div>
  )
}

export default GenreSelectionList
