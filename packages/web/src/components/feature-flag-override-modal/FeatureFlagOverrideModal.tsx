import { useCallback, useEffect, useRef, useState } from 'react'

import {
  FeatureFlags,
  FEATURE_FLAG_OVERRIDE_KEY,
  OverrideSetting,
  accountSelectors
} from '@audius/common'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  SegmentedControl
} from '@audius/stems'

import { useModalState } from 'common/hooks/useModalState'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useDevModeHotkey } from 'hooks/useHotkey'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { useSelector } from 'utils/reducer'
import zIndex from 'utils/zIndex'

import styles from './FeatureFlagOverrideModal.module.css'
const { getHasAccount } = accountSelectors

const flags = Object.values(FeatureFlags)
const messages = {
  title: 'Feature Flag Override Settings'
}

const getOverrideSetting = (flag: string) =>
  localStorage.getItem(
    `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  ) as OverrideSetting

const setOverrideSetting = (flag: string, val: OverrideSetting) => {
  const flagKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  if (val === null) return localStorage.removeItem(flagKey)
  localStorage.setItem(flagKey, val)
}

export const FeatureFlagOverrideModal = () => {
  const hotkeyToggle = useDevModeHotkey(70 /* f */)
  const [hotkeyActive, setHotkeyActive] = useState(true)
  const [remoteInstanceLoaded, setRemoteInstanceLoaded] = useState(false)
  const [_, setIsOpen] = useModalState('FeatureFlagOverride')
  const defaultSettings = useRef<Record<string, boolean>>({})
  const hasAccount = useSelector(getHasAccount)
  const [overrideSettings, setOverrideSettings] = useState(
    flags.reduce<Record<string, OverrideSetting>>(
      (acc, flag) => ({ ...acc, [flag]: getOverrideSetting(flag) }),
      {}
    )
  )

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
    setHotkeyActive((active) => !active)
  }, [hotkeyToggle])

  const closeModal = useCallback(() => {
    setHotkeyActive(false)
    setIsOpen(false)
  }, [])

  return (
    <Modal
      title={messages.title}
      onClose={closeModal}
      isOpen={hotkeyActive}
      zIndex={zIndex.FEATURE_FLAG_OVERRIDE_MODAL}
    >
      <ModalHeader onClose={closeModal}>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        {remoteInstanceLoaded ? (
          <div className={styles.optionContainer}>
            {flags.map((flag) => (
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
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <LoadingSpinner className={styles.loader} />
        )}
      </ModalContent>
    </Modal>
  )
}
