import { useCallback, useRef, useState } from 'react'

import { castSelectors } from '@audius/common/store'
import { Flex, IconButton, IconCast, Tooltip } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { ConnectPopup } from './ConnectPopup'
import { useRemotePlayback } from './useRemotePlayback'

const { getIsCasting } = castSelectors

const messages = {
  cast: 'Cast'
}

export const CastButton = () => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const isCasting = useSelector(getIsCasting)
  const { supported, prompt } = useRemotePlayback()

  const handleToggle = useCallback(() => {
    setIsOpen((o) => !o)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSelectCastDevices = useCallback(() => {
    prompt()
    setIsOpen(false)
  }, [prompt])

  if (!supported) return null

  return (
    <>
      <Flex ref={anchorRef as any} alignItems='center' justifyContent='center'>
        <Tooltip text={messages.cast} placement='top' mount='body'>
          <Flex>
            <IconButton
              icon={IconCast}
              size='m'
              color={isCasting ? 'accent' : 'subdued'}
              aria-label={messages.cast}
              aria-expanded={isOpen}
              onClick={handleToggle}
            />
          </Flex>
        </Tooltip>
      </Flex>
      <ConnectPopup
        isVisible={isOpen}
        anchorRef={anchorRef}
        isCasting={isCasting}
        onClose={handleClose}
        onSelectCastDevices={handleSelectCastDevices}
      />
    </>
  )
}
