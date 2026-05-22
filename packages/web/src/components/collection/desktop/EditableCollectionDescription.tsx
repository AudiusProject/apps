import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Flex, IconPencil, Text } from '@audius/harmony'

import { UserGeneratedText } from 'components/user-generated-text'

import styles from './CollectionHeader.module.css'

const DESCRIPTION_MAX_LENGTH = 1000

const messages = {
  addDescription: 'Add a description...',
  ariaLabel: 'Edit description'
}

type EditableCollectionDescriptionProps = {
  value: string
  onSave: (next: string) => void
}

export const EditableCollectionDescription = ({
  value,
  onSave
}: EditableCollectionDescriptionProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  const commit = useCallback(() => {
    if (draft !== value) onSave(draft)
    setEditing(false)
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    },
    [cancel]
  )

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
        placeholder={messages.addDescription}
        aria-label={messages.ariaLabel}
        className={styles.descriptionInput}
      />
    )
  }

  return (
    <button
      type='button'
      onClick={() => setEditing(true)}
      aria-label={messages.ariaLabel}
      className={styles.editableDescription}
    >
      <Flex gap='s' alignItems='flex-start'>
        {value ? (
          <UserGeneratedText
            size='s'
            linkSource='collection page'
            css={{ textAlign: 'left' }}
          >
            {value}
          </UserGeneratedText>
        ) : (
          <Text size='s' color='subdued' textAlign='left'>
            {messages.addDescription}
          </Text>
        )}
        <IconPencil className={styles.editIcon} color='subdued' />
      </Flex>
    </button>
  )
}
