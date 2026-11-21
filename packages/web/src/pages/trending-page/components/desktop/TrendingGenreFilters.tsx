import { ChangeEvent, useCallback, useEffect, useState } from 'react'

import { removeNullable } from '@audius/common/utils'
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

export const TrendingGenreFilters = (props: TrendingGenreFiltersProps) => {
  const { currentGenre, didSelectGenre, didSelectMore } = props
  const isSelectedFromModal = (genre: string | null): genre is string => {
    return genre !== null && initialGenres.indexOf(genre) === -1
  }

  const [lastModalSelectedGenre, setLastModalSelectedGenre] = useState<
    string | null
  >(null)

  const genres = [...initialGenres]

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
          label={genre}
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
