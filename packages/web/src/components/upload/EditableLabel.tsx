import { ChangeEvent, useCallback } from 'react'

import { Text } from '@audius/harmony'

type EditableLabelProps = {
  isEditing: boolean
  setIsEditing: (isEditing: boolean) => void
  value: string
  setValue: (value: string) => void
  onSave?: () => void
}

export const EditableLabel = ({
  isEditing,
  setIsEditing,
  value,
  setValue,
  onSave
}: EditableLabelProps) => {
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    onSave?.()
  }, [setIsEditing, onSave])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    [setValue]
  )

  if (isEditing) {
    return (
      <input
        defaultValue={value}
        onChange={handleChange}
        onBlur={handleBlur}
        css={{
          flex: '1 1 0',
          border: 'none',
          background: 'none',
          fontSize: 14,
          fontWeight: 500,
          // iOS Safari zooms the page on focus when input text is under 16px
          '@media (hover: none) and (pointer: coarse)': { fontSize: 16 }
        }}
        autoFocus
      />
    )
  }
  return (
    <Text size='s' variant='body' css={{ flex: '1 1 0' }}>
      {value}
    </Text>
  )
}
