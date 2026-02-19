import { ChangeEvent, useCallback, useEffect, useState } from 'react'

import { getCanonicalName, removeNullable } from '@audius/common/utils'
import { Flex, IconKebabHorizontal, SelectablePill } from '@audius/harmony'

const messages = {
  all: 'All Genres',
  more: 'More genres'
}

const initialGenres = ['Electronic', 'Hip-Hop/Rap', 'Alternative']

type TrendingGenreFiltersProps = {
  currentGenre: string | null
  didSelectGenre: (genre: string | null) => void
  didSelectMore: () => void
}

/**
 * TrendingGenreFilters maintains a row of toggleable buttons for filtering the trending lineups by genre.
 */
export const TrendingGenreFilters = (props: TrendingGenreFiltersProps) => {
  const { currentGenre, didSelectGenre, didSelectMore } = props
  // type guard for whether this is a genre specified by the user via the modal
  const isSelectedFromModal = (genre: string | null): genre is string => {
    return genre !== null && initialGenres.indexOf(genre) === -1
  }

  // Need to store our the last user specified genre (e.g. one picked thru the modal)
  // so that we can keep it rendered even if the user subsequently selects
  // one of the preselected genres.
  const [lastModalSelectedGenre, setLastModalSelectedGenre] = useState<
    string | null
  >(null)

  // Avoid mutating initialGenres
  const genres = [...initialGenres]

  // Set the last seen modal selected genre, and make sure we render it
  // even if it's not selected.
  if (
    isSelectedFromModal(currentGenre) &&
    currentGenre !== lastModalSelectedGenre
  ) {
    genres.push(currentGenre)
  } else if (lastModalSelectedGenre) {
    genres.push(lastModalSelectedGenre)
  }

  useEffect(() => {
    if (
      isSelectedFromModal(currentGenre) &&
      currentGenre !== lastModalSelectedGenre
    ) {
      setLastModalSelectedGenre(currentGenre)
    }
  }, [currentGenre, lastModalSelectedGenre])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedGenre = e.target.value
      if (selectedGenre === messages.all) {
        didSelectGenre(null)
      } else {
        didSelectGenre(selectedGenre)
      }
    },
    [didSelectGenre]
  )

  return (
    <Flex gap='s' role='radiogroup' onChange={handleChange}>
      <SelectablePill
        type='radio'
        name='trending-genre-filter'
        label={messages.all}
        value={messages.all}
        size='large'
        isSelected={currentGenre === null}
      />
      {genres.filter(removeNullable).map((genre) => (
        <SelectablePill
          key={genre}
          name='trending-genre-filter'
          type='radio'
          label={getCanonicalName(genre)}
          value={genre}
          size='large'
          isSelected={genre === currentGenre}
        />
      ))}
      <SelectablePill
        type='button'
        icon={IconKebabHorizontal}
        aria-label={messages.more}
        size='large'
        onClick={didSelectMore}
      />
    </Flex>
  )
}
