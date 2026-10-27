import { useGenreSuggestions } from '@audius/common/api'
import { getStaticGenreSuggestions } from '@audius/common/utils'

import { TextField, TextFieldProps } from 'components/form-fields'

const GENRE_DATALIST_ID = 'genre-suggestions'
const GENRE_MAX_LENGTH = 100

const messages = {
  genre: 'Pick a Genre'
}

type SelectGenreFieldProps = Partial<TextFieldProps> & {
  name: string
  /**
   * Id for the suggestions datalist. Pass a unique id when rendering more
   * than one genre field on a page so the ids don't collide.
   */
  datalistId?: string
}

const staticSuggestions = getStaticGenreSuggestions()

export const SelectGenreField = (props: SelectGenreFieldProps) => {
  const { datalistId = GENRE_DATALIST_ID, ...other } = props
  const { data: suggestions = staticSuggestions } = useGenreSuggestions()

  return (
    <>
      <TextField
        aria-label={messages.genre}
        label='Genre'
        placeholder={messages.genre}
        required
        maxLength={GENRE_MAX_LENGTH}
        list={datalistId}
        {...other}
      />
      <datalist id={datalistId}>
        {suggestions.map(({ value }) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  )
}
