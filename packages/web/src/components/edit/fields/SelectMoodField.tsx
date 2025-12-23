import { SelectField, SelectFieldProps } from 'components/form-fields'
import { moodEmojiMap } from 'utils/Moods'

const options = Object.entries(moodEmojiMap).map(([mood, emojiClass]) => ({
  value: mood,
  label: mood,
  leadingElement: (
    <i className={`emoji ${emojiClass}`} style={{ marginBottom: 0 }} />
  )
}))

const messages = {
  mood: 'Pick a Mood'
}

type SelectMoodFieldProps = Partial<SelectFieldProps> & {
  name: string
}

export const SelectMoodField = (props: SelectMoodFieldProps) => {
  return (
    <SelectField
      aria-label={messages.mood}
      label='Mood'
      placeholder={messages.mood}
      options={options}
      {...props}
    />
  )
}
