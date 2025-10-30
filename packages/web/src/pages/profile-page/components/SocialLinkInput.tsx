import { useState, useRef, useMemo } from 'react'

import {
  IconLink,
  IconTikTok,
  IconX,
  IconInstagram,
  useTheme
} from '@audius/harmony'
import cn from 'classnames'

import Input from 'components/data-entry/Input'

import { Type, handleTypes } from './SocialLink'
import styles from './SocialLinkInput.module.css'

const socialLinkIcons = {
  [Type.X]: IconX,
  [Type.INSTAGRAM]: IconInstagram,
  [Type.TIKTOK]: IconTikTok,
  [Type.WEBSITE]: IconLink
}

const socialLinkPlaceholders = {
  [Type.X]: 'X Handle',
  [Type.INSTAGRAM]: 'Instagram Handle',
  [Type.TIKTOK]: 'TikTok Handle',
  [Type.WEBSITE]: 'Website'
}

const sanitizeHandle = (handle: string) => {
  if (handle.startsWith('http')) {
    if (handle.includes('x')) {
      const split = handle.split('x.com/')[1]
      if (split) {
        return split.split('/')[0]
      }
    }
    if (handle.includes('instagram')) {
      const split = handle.split('instagram.com/')[1]
      if (split) {
        return split.split('/')[0]
      }
    }
    if (handle.includes('tiktok')) {
      const split = handle.split('tiktok.com/')[1]
      if (split) {
        return split.split('/')[0]
      }
    }
  }
  return handle
}

type SocialLinkInputProps = {
  type: Type
  className?: string
  defaultValue: string
  onChange: (value: string) => void
  isDisabled?: boolean
  textLimitMinusLinks?: number
}

const SocialLinkInput = ({
  type,
  className,
  defaultValue,
  onChange,
  isDisabled = false,
  textLimitMinusLinks
}: SocialLinkInputProps) => {
  const [value, setValue] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const timeoutRef = useRef<any>()
  const { spacing } = useTheme()

  const inputRef = useRef()

  const isHandle = useMemo(() => handleTypes.includes(type), [type])

  const handleOnChange = (text: string) => {
    if (textLimitMinusLinks) {
      const textWithoutLinks = text.replace(/(?:https?):\/\/[\n\S]+/g, '')
      if (textWithoutLinks.length > textLimitMinusLinks) return
    }

    let sanitized: string
    if (isHandle) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (text.startsWith('@')) {
          setValue((value) => value.slice(1))
          onChange(value.slice(1))
        }
      }, 600)
      setValue(text)
      sanitized = sanitizeHandle(text)
      if (sanitized !== text) {
        setTimeout(() => {
          setValue(sanitized)
          onChange(sanitized)
        }, 300)
      }
    } else {
      sanitized = text
      setValue(sanitized)
    }
    onChange(sanitized)
  }

  const onFocus = () => {
    setFocused(true)
  }

  const onBlur = () => {
    setFocused(false)
  }

  const Icon = socialLinkIcons[type]
  const placeholder = socialLinkPlaceholders[type]

  return (
    <div
      className={cn(styles.socialLinkInput, {
        [styles.focused]: focused,
        [styles.hasValue]: value
      })}
    >
      <Icon
        color='accent'
        css={{
          position: 'absolute',
          top: spacing.unit1,
          left: spacing.unit1,
          zIndex: 2
        }}
      />
      {isHandle && <span className={styles.at}>{'@'}</span>}
      <Input
        className={cn(styles.input, className, {
          [styles.handle]: isHandle,
          [styles.disabled]: isDisabled
        })}
        characterLimit={200}
        size='small'
        disabled={isDisabled}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={handleOnChange}
        onFocus={onFocus}
        onBlur={onBlur}
        inputRef={inputRef}
        value={value}
      />
    </div>
  )
}

export default SocialLinkInput
