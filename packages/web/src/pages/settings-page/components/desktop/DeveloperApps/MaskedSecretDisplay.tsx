import { useCallback, useState } from 'react'

import {
  IconCopy,
  IconVisibilityHidden,
  IconVisibilityPublic,
  IconButton,
  Flex,
  Divider
} from '@audius/harmony'

import Toast from 'components/toast/Toast'
import { copyToClipboard } from 'utils/clipboardUtil'

import styles from './MaskedSecretDisplay.module.css'

const VISIBLE_TAIL_LENGTH = 4
const MASK_CHAR = '•'

const getMaskedDisplay = (value: string) => {
  if (value.length <= VISIBLE_TAIL_LENGTH) return MASK_CHAR.repeat(4)
  return (
    MASK_CHAR.repeat(Math.max(value.length - VISIBLE_TAIL_LENGTH, 4)) +
    value.slice(-VISIBLE_TAIL_LENGTH)
  )
}

type MaskedSecretDisplayProps = {
  value: string
  copiedMessage?: string
  copyLabel: string
  revealLabel: string
  hideLabel: string
  /** Optional extra actions to render (e.g. delete button) */
  extraActions?: React.ReactNode
  dividerClassName?: string
}

export const MaskedSecretDisplay = (props: MaskedSecretDisplayProps) => {
  const {
    value,
    copiedMessage = 'Copied!',
    copyLabel,
    revealLabel,
    hideLabel,
    extraActions,
    dividerClassName
  } = props

  const [isRevealed, setIsRevealed] = useState(false)
  const displayValue = isRevealed ? value : getMaskedDisplay(value)
  const VisibilityIcon = isRevealed
    ? IconVisibilityPublic
    : IconVisibilityHidden
  const visibilityLabel = isRevealed ? hideLabel : revealLabel

  const handleCopy = useCallback(() => copyToClipboard(value), [value])

  return (
    <>
      <span className={styles.keyText}>{displayValue}</span>
      <Divider orientation='vertical' className={dividerClassName} />
      <Flex gap='xs' alignItems='center' className={styles.actions}>
        <Toast
          text={copiedMessage}
          portalLocation={
            typeof document !== 'undefined'
              ? (document.getElementById('page') ?? document.body)
              : undefined
          }
        >
          <IconButton
            onClick={handleCopy}
            aria-label={copyLabel}
            color='subdued'
            icon={IconCopy}
          />
        </Toast>
        <IconButton
          onClick={() => setIsRevealed((v) => !v)}
          aria-label={visibilityLabel}
          color='subdued'
          icon={VisibilityIcon}
        />
        {extraActions}
      </Flex>
    </>
  )
}
