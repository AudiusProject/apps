import { SelectField, SelectFieldProps } from 'components/form-fields'
import { moodMap } from 'utils/Moods'

// Extract just the emoji icon from the moodMap element to avoid text duplication
// The moodMap elements contain both text and emoji, so we extract just the emoji part
const extractEmoji = (el: JSX.Element): JSX.Element | undefined => {
  // The moodMap structure is: <Flex>Text <i className='emoji ...' /></Flex>
  // We extract just the <i> element (the emoji)
  if (el?.props?.children) {
    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children]
    const emojiElement = children.find(
      (child) =>
        typeof child === 'object' &&
        child?.props?.className?.startsWith('emoji')
    )
    if (emojiElement) {
      return emojiElement
    }
  }
  return undefined
}

const options = Object.entries(moodMap).map(([k, el]) => {
  const emoji = extractEmoji(el)
  return {
    value: k,
    label: k,
    ...(emoji ? { leadingElement: emoji } : {})
  }
})

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
