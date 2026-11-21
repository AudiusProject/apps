import { useCallback, useMemo, useRef, useState } from 'react'

import { Flex, IconButton, IconCast, Tooltip } from '@audius/harmony'

import { ConnectPopup } from './ConnectPopup'
import { isSafari, useRemotePlayback } from './useRemotePlayback'

const messages = {
  cast: 'Cast',
  airplay: 'AirPlay'
}

export const CastButton = () => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [pickedCast, setPickedCast] = useState(false)
  const { supported, state, prompt } = useRemotePlayback()
  const isCasting =
    pickedCast || state === 'connected' || state === 'connecting'
  const mode = useMemo<'airplay' | 'cast'>(
    () => (isSafari() ? 'airplay' : 'cast'),
    []
  )
  const tooltipLabel = mode === 'airplay' ? messages.airplay : messages.cast

  const handleToggle = useCallback(() => {
    setIsOpen((o) => !o)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSelectCastDevices = useCallback(async () => {
    setIsOpen(false)
    try {
      await prompt()
      setPickedCast(true)
    } catch {
      // User cancelled the picker — leave the existing state.
    }
  }, [prompt])

  const handleSelectThisBrowser = useCallback(async () => {
    setIsOpen(false)
    if (isCasting) {
      try {
        await prompt()
      } catch {
        // User cancelled the picker — leave the existing state.
      }
    }
    setPickedCast(false)
  }, [isCasting, prompt])

  if (!supported) return null

  return (
    <>
      <Flex ref={anchorRef as any} alignItems='center' justifyContent='center'>
        <Tooltip text={tooltipLabel} placement='top' mount='body'>
          <Flex>
            <IconButton
              icon={IconCast}
              size='m'
              color={isCasting ? 'accent' : 'subdued'}
              aria-label={tooltipLabel}
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
        mode={mode}
        onClose={handleClose}
        onSelectThisBrowser={handleSelectThisBrowser}
        onSelectCastDevices={handleSelectCastDevices}
      />
    </>
  )
}
