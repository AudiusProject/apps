import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useHasAccount } from '@audius/common/api'
import {
  OverrideSetting,
  FEATURE_FLAG_OVERRIDE_KEY
} from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { fuzzySearch } from '@audius/common/utils'
import {
  Box,
  Flex,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  PlainButton,
  SegmentedControl,
  TextInput
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useDevModeHotkey } from 'hooks/useDevModeHotkey'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import zIndex from 'utils/zIndex'

import styles from './FeatureFlagOverrideModal.module.css'

const flags = Object.values(FeatureFlags)
const messages = {
  title: 'Feature Flag Override Settings',
  filterPlaceholder: 'Filter Feature Flags',
  restart: 'Restart'
}

const getOverrideSetting = (flag: string) => {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(
    `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  ) as OverrideSetting
}

const setOverrideSetting = (flag: string, val: OverrideSetting) => {
  const flagKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  if (val === null) return localStorage.removeItem(flagKey)
  localStorage.setItem(flagKey, val)
}

export const FeatureFlagOverrideModal = () => {
  const hotkeyToggle = useDevModeHotkey(70)
  const [ignoredHotkeyActive, setHotkeyActive] = useState(true)
  const [filter, setFilter] = useState('')
  const [remoteInstanceLoaded, setRemoteInstanceLoaded] = useState(false)
  const [isOpen, setIsOpen] = useModalState('FeatureFlagOverride')
  const defaultSettings = useRef<Record<string, boolean>>({})
  const hasAccount = useHasAccount()
  const [overrideSettings, setOverrideSettings] = useState(
    flags.reduce<Record<string, OverrideSetting>>(
      (acc, flag) => ({ ...acc, [flag]: getOverrideSetting(flag) }),
      {}
    )
  )

  const [isFlagChanged, setIsFlagChanged] = useState(false)

  useEffect(() => {
    const updateDefaultSettings = () => {
      defaultSettings.current = flags.reduce<Record<string, boolean>>(
        (acc, flag) => ({
          ...acc,
          [flag]: remoteConfigInstance.getFeatureEnabled(flag) ?? false
        }),
        {}
      )
      setRemoteInstanceLoaded(true)
    }

    if (hasAccount) {
      remoteConfigInstance.waitForUserRemoteConfig().then(updateDefaultSettings)
    } else {
      remoteConfigInstance.waitForRemoteConfig().then(updateDefaultSettings)
    }
  }, [hasAccount])

  useEffect(() => {
    setHotkeyActive((active) => {
      const newValue = !active
      setIsOpen(newValue)
      return newValue
    })
  }, [hotkeyToggle, setIsOpen])

  const closeModal = useCallback(() => {
    setHotkeyActive(false)
    setIsOpen(false)
  }, [setIsOpen])

  const filteredFlags = useMemo(() => {
    return filter ? fuzzySearch(filter, flags, 3) : flags
  }, [filter])

  return (
    <Modal
      title={messages.title}
      onClose={closeModal}
      isOpen={isOpen}
      zIndex={zIndex.FEATURE_FLAG_OVERRIDE_MODAL}
      size='medium'
    >
      <ModalHeader onClose={closeModal}>
        <ModalTitle title={messages.title}>hi</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <Flex column gap='xl'>
          {isFlagChanged ? (
            <Box mb='l'>
              <PlainButton
                onClick={() => window.location.reload()}
                size='large'
                fullWidth
              >
                {messages.restart}
              </PlainButton>
            </Box>
          ) : null}
          <TextInput
            autoFocus
            label={messages.filterPlaceholder}
            onChange={(e) => setFilter(e.target.value)}
            value={filter}
          />
          {remoteInstanceLoaded ? (
            <div className={styles.optionContainer}>
              {filteredFlags.map((flag) => (
                <div key={flag} className={styles.option}>
                  <span>{flag}: </span>
                  <SegmentedControl
                    options={[
                      {
                        key: 'default',
                        text: `Default (${
                          defaultSettings.current[flag] ? 'Enabled' : 'Disabled'
                        })`
                      },
                      { key: 'enabled', text: 'Enabled' },
                      { key: 'disabled', text: 'Disabled' }
                    ]}
                    selected={overrideSettings[flag] ?? 'default'}
                    onSelectOption={(key: string) => {
                      const val: OverrideSetting =
                        key === 'default' ? null : (key as OverrideSetting)
                      setOverrideSettings((prev) => ({ ...prev, [flag]: val }))
                      setOverrideSetting(flag as FeatureFlags, val)
                      setIsFlagChanged(true)
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <LoadingSpinner className={styles.loader} />
          )}
        </Flex>
      </ModalContent>
    </Modal>
  )
}
