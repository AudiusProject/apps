import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Flex, IconPencil, Text } from '@audius/harmony'
import cn from 'classnames'

import styles from './CollectionHeader.module.css'

type EditableCollectionTitleProps = {
  value: string
  onSave: (next: string) => void
}

export const EditableCollectionTitle = ({
  value,
  onSave
}: EditableCollectionTitleProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  const commit = useCallback(() => {
    const next = draft.trim()
    if (next.length > 0 && next !== value) {
      onSave(next)
    }
    setEditing(false)
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    },
    [commit, cancel]
  )

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label='Edit title'
        className={styles.titleInput}
      />
    )
  }

  return (
    <button
      type='button'
      onClick={() => setEditing(true)}
      aria-label='Edit title'
      className={cn(styles.editableTitle, styles.editableTitleButton)}
    >
      <Flex gap='s' alignItems='center'>
        <Text
          variant='heading'
          size='xl'
          className={styles.titleHeader}
          textAlign='left'
          css={{
            fontSize: 'clamp(24px, calc(1.6cqi + 18.75px), 36px)',
            lineHeight: 1.33
          }}
        >
          {value}
        </Text>
        <IconPencil className={styles.editIcon} color='subdued' />
      </Flex>
    </button>
  )
}
