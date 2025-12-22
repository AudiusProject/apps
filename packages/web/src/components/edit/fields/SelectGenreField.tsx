import { GENRES, convertGenreLabelToValue } from '@audius/common/utils'

import { SelectField, SelectFieldProps } from 'components/form-fields'

const messages = {
  genre: 'Pick a Genre'
}

type SelectGenreFieldProps = Partial<SelectFieldProps> & {
  name: string
}

const options = GENRES.map((genre) => ({
  value: convertGenreLabelToValue(genre),
  label: genre
}))

export const SelectGenreField = (props: SelectGenreFieldProps) => {
  return (
    <SelectField
      aria-label={messages.genre}
      label='Genre'
      placeholder={messages.genre}
      options={options}
      required
      {...props}
    />
  )
}
