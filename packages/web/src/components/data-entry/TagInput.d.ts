export type TagInputProps = {
  placeholder?: string
  defaultTags?: string[]
  tags?: Set<string>
  maxTags?: number
  maxCharacters?: number
  minCharacters?: number
  label?: string
  labelStyle?: string
  size?: 'normal' | 'small'
  layout?: 'horizontal' | 'vertical'
  onChangeTags: (value: Set<string>) => void
}

declare const TagInput = (props: TagInputProps) => JSX.Element

export default TagInput
