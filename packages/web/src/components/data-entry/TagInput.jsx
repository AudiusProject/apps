import { useRef, useEffect, useState } from 'react'

import { trimToAlphaNumeric } from '@audius/common/utils'
import { Tag } from '@audius/harmony'
import cn from 'classnames'
import PropTypes from 'prop-types'

import styles from './TagInput.module.css'

const isAlphaNumeric = (string) => {
  return /^[a-zA-Z0-9]+$/.test(string)
}

const isAlphaNumericKeyCode = (e) => {
  const char = String.fromCharCode(e.keyCode)
  if (e.shiftKey) {
    if (char === '3') {
      return true
    }
    return /[A-Z]/.test(char)
  }
  return /[A-Z0-9]/.test(char)
}

const TagInput = ({
  placeholder = 'new tag',
  defaultTags = [],
  maxTags = 10,
  maxCharacters = 25,
  minCharacters = 0,
  label = '',
  size = 'normal',
  layout = 'vertical',
  onChangeTags = () => {},
  tags: controlledTags,
  typingMode: controlledTypingMode,
  flashExistingTag: controlledFlashExistingTag,
  'aria-label': ariaLabel,
  labelStyle
}) => {
  const [tags, setTags] = useState(new Set(defaultTags))
  const [typingMode, setTypingMode] = useState(false)
  const [flashExistingTag, setFlashExistingTag] = useState(null)

  const newTagInputRef = useRef()

  useEffect(() => {
    if (typingMode && newTagInputRef.current) {
      newTagInputRef.current.focus()
    }
  }, [typingMode])

  useEffect(() => {
    if (controlledTags && controlledTags !== tags) {
      setTags(controlledTags)
    }
  }, [controlledTags, tags])

  const isValidTag = (tag) => {
    return (
      tag.length <= maxCharacters &&
      tag.length > minCharacters &&
      isAlphaNumeric(tag)
    )
  }

  const formatTag = (tag) => {
    return trimToAlphaNumeric(tag)
  }

  const addTag = (input) => {
    let tag = formatTag(input)
    if (tag.length > maxCharacters) {
      tag = tag.slice(0, maxCharacters)
    }
    if (isValidTag(tag)) {
      let newFlashExistingTag = null
      const newSet = new Set(tags)
      if (newSet.size < maxTags) {
        if (tags.has(tag)) {
          newFlashExistingTag = tag
          setTimeout(() => {
            setFlashExistingTag(null)
          }, 200)
        }
        newSet.add(tag)
      }
      setTags(newSet)
      setTypingMode(newSet.size !== maxTags)
      setFlashExistingTag(newFlashExistingTag)
      onChangeTags(newSet)
      newTagInputRef.current.value = ''
    }
  }

  const deleteTag = (tag, e) => {
    if (e) e.stopPropagation()
    const newTags = new Set(tags)
    newTags.delete(tag)
    setTags(newTags)
    onChangeTags(newTags)
  }

  const onNewTagInputKeyPress = (e) => {
    const newTag = newTagInputRef.current.value.toLowerCase()
    if (e.keyCode === 13 || e.keyCode === 9 || e.keyCode === 188) {
      e.preventDefault()
      addTag(newTag)
    } else if (e.keyCode === 8 && newTag.length === 0) {
      const lastTag = [...tags.keys()].pop()
      deleteTag(lastTag)
    }

    if (
      (newTag.length > maxCharacters - 1 && e.keyCode !== 8) ||
      (e.keyCode !== 8 && !isAlphaNumericKeyCode(e))
    ) {
      e.preventDefault()
      return false
    }
  }

  const onNewTagInputBlur = () => {
    const newTag = newTagInputRef.current.value.toLowerCase()
    addTag(newTag)
    setTypingMode(false)
  }

  const displayTypingMode =
    controlledTypingMode !== undefined ? controlledTypingMode : typingMode
  const displayFlashExistingTag =
    controlledFlashExistingTag !== undefined
      ? controlledFlashExistingTag
      : flashExistingTag

  const style = {
    [styles.horizontal]: layout === 'horizontal',
    [styles.vertical]: layout === 'vertical',
    [styles.normal]: size === 'normal',
    [styles.small]: size === 'small',
    [styles.focused]: displayTypingMode
  }

  const tagNodes = [...tags].map((tag) => (
    <Tag
      className={cn({ [styles.flash]: displayFlashExistingTag === tag })}
      key={tag}
      variant='default'
      onClick={(e) => deleteTag(tag, e)}
    >
      {trimToAlphaNumeric(tag)}
    </Tag>
  ))

  const newTag = (
    <>
      {!displayTypingMode ? (
        <Tag variant='composed' multiselect onClick={() => setTypingMode(true)}>
          {placeholder}
        </Tag>
      ) : null}
      <input
        aria-label={ariaLabel}
        ref={newTagInputRef}
        className={cn(styles.newTagInput, {
          [styles.activeInput]: displayTypingMode
        })}
        onKeyDown={onNewTagInputKeyPress}
        onBlur={onNewTagInputBlur}
      />
    </>
  )

  return (
    <div className={cn(styles.wrapper, style)}>
      {label ? (
        <div className={cn(styles.label, labelStyle)}>{label}</div>
      ) : null}
      <div className={styles.tagInput} onClick={() => setTypingMode(true)}>
        {tagNodes}
        {tags.size < maxTags ? newTag : null}
        <div
          className={cn(styles.tagCount, {
            [styles.nearLimit]: tags.size > (7.0 / 8.0) * maxTags
          })}
        >
          {tags.size}/{maxTags}
        </div>
      </div>
    </div>
  )
}

TagInput.propTypes = {
  className: PropTypes.string,
  placeholder: PropTypes.string,
  defaultTags: PropTypes.array,
  maxTags: PropTypes.number,
  maxCharacters: PropTypes.number,
  minCharacters: PropTypes.number,
  label: PropTypes.string,
  size: PropTypes.oneOf(['normal', 'small']),
  layout: PropTypes.oneOf(['horizontal', 'vertical']),
  onChangeTags: PropTypes.func
}

export default TagInput
