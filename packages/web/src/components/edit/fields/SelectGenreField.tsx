import { GENRES, convertGenreLabelToValue } from '@audius/common/utils'

import { TextField, TextFieldProps } from 'components/form-fields'

const GENRE_DATALIST_ID = 'genre-suggestions'
const GENRE_MAX_LENGTH = 100

const messages = {
  genre: 'Pick a Genre'
}

type SelectGenreFieldProps = Partial<TextFieldProps> & {
  name: string
}

const suggestions = Array.from(
  new Set(GENRES.map((genre) => convertGenreLabelToValue(genre)))
)

export const SelectGenreField = (props: SelectGenreFieldProps) => {
  return (
    <>
      <TextField
        aria-label={messages.genre}
        label='Genre'
        placeholder={messages.genre}
        required
        maxLength={GENRE_MAX_LENGTH}
        list={GENRE_DATALIST_ID}
        {...props}
      />
      <datalist id={GENRE_DATALIST_ID}>
        {suggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  )
}
