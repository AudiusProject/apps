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
  // The audio element is routed through an AudioContext on this app, so
  // `audio.remote.state` doesn't reliably flip to 'connected' when the user
  // tab-casts via the system picker. Track an optimistic local flag set when
  // the user successfully picks a device.
  const [pickedCast, setPickedCast] = useState(false)
  const { supported, state, prompt } = useRemotePlayback()
  const isCasting =
    pickedCast || state === 'connected' || state === 'connecting'
  // Safari's `audio.remote.prompt()` opens the AirPlay picker; on Chromium
  // it opens Chrome's cast picker. Label the popup row + tooltip accordingly.
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
      // RemotePlayback has no programmatic disconnect. Re-opening the
      // browser's native picker shows a "Stop casting" option for the
      // currently-active device — the user clicks that to return audio
      // to the local browser. This is the same flow Spotify uses.
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
