import { useState, useRef, useMemo } from 'react'

import type { SocialPlatform } from '@audius/common/models'
import { sanitizeSocialHandle } from '@audius/common/utils'
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

const platformByType: Partial<Record<Type, SocialPlatform>> = {
  [Type.X]: 'x',
  [Type.INSTAGRAM]: 'instagram',
  [Type.TIKTOK]: 'tiktok'
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
  const timeoutRef = useRef<any | undefined>(undefined)
  const { spacing } = useTheme()

  const inputRef = useRef<HTMLInputElement | null>(null)

  const isHandle = useMemo(() => handleTypes.includes(type), [type])

  const handleOnChange = (text: string) => {
    if (textLimitMinusLinks) {
      const textWithoutLinks = text.replace(/(?:https?):\/\/[\n\S]+/g, '')
      if (textWithoutLinks.length > textLimitMinusLinks) return
    }

    let sanitized: string
    if (isHandle) {
      setValue(text)
      const platform = platformByType[type]
      const sanitizedHandle = platform
        ? sanitizeSocialHandle(text, platform)
        : text
      sanitized = sanitizedHandle ?? ''
      clearTimeout(timeoutRef.current)
      if (sanitized !== text) {
        timeoutRef.current = setTimeout(() => {
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
      {/* @ts-ignore */}
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
