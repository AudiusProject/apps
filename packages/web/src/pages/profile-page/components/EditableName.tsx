import { useState, useRef, useEffect } from 'react'

import { IconButton, IconPencil, useTheme } from '@audius/harmony'
import cn from 'classnames'

import UserBadges from 'components/user-badges'

import styles from './EditableName.module.css'

const messages = {
  editLabel: 'Edit Name'
}

type EditableNameProps = {
  name: string
  userId: number
  onChange: (name: string) => void
  editable: boolean
  className?: string
  verified?: boolean
}

export const EditableName = (props: EditableNameProps) => {
  const { spacing } = useTheme()
  const { name, userId, onChange, editable, className, verified } = props
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  })

  const onInputBlur = () => {
    setEditing(false)
    onChange(inputRef.current?.value as string)
  }

  return (
    <div className={cn(styles.name, className)}>
      {editable ? (
        editing ? (
          <>
            <input
              ref={inputRef}
              defaultValue={name || ''}
              onBlur={onInputBlur}
              maxLength={32}
            />
          </>
        ) : (
          <div className={styles.editNameContainer}>
            <span className={styles.editingName}>{name}</span>
            <IconButton
              css={{ marginBottom: spacing.s }}
              aria-label={messages.editLabel}
              icon={IconPencil}
              color='white'
              onClick={() => setEditing(true)}
              shadow='drop'
            />
          </div>
        )
      ) : (
        <>
          <h1>{name}</h1>
          <UserBadges
            userId={userId}
            size='l'
            className={styles.iconVerified}
            isVerifiedOverride={verified}
          />
        </>
      )}
    </div>
  )
}
