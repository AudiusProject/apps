import { useCallback, useMemo } from 'react'

import { removeNullable } from '@audius/common/utils'
import { useField } from 'formik'

import TagInput, { TagInputProps } from 'components/data-entry/TagInput'

type TagFieldProps = Partial<TagInputProps> & {
  name: string
}

export const TagField = (props: TagFieldProps) => {
  const { name, ...other } = props
  const [field, , { setValue }] = useField<string>(name)
  const { value, ...otherField } = field

  const tagList = useMemo(
    () => (value ?? '').split(',').filter(removeNullable),
    [value]
  )
  const tagSet = useMemo(() => new Set(value ? tagList : []), [tagList, value])

  const handleChangeTags = useCallback(
    (value: Set<string>) => setValue([...value].join(',')),
    [setValue]
  )

  return (
    <TagInput
      tags={tagSet}
      aria-label='tags'
      {...otherField}
      onChangeTags={handleChangeTags}
      {...other}
    />
  )
}
