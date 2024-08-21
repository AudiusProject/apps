import { useCallback, useMemo, useState } from 'react'

import { FEATURE_FLAG_OVERRIDE_KEY } from '@audius/common/hooks'
import type { OverrideSetting } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { FlatList } from 'react-native-gesture-handler'
import RNRestart from 'react-native-restart'
import { useAsync } from 'react-use'

import { IconEmbed, IconClose } from '@audius/harmony-native'
import {
  ModalScreen,
  Screen,
  SegmentedControl,
  TextButton
} from 'app/components/core'
import { FilterInput } from 'app/components/filter-input'
import { useNavigation } from 'app/hooks/useNavigation'
import { remoteConfigInstance } from 'app/services/remote-config/remote-config-instance'

import { fuzzySearch } from '../../utils/fuzzySearch'
import { TopBarIconButton } from '../app-screen'
import { useAppScreenOptions } from '../app-screen/useAppScreenOptions'
import { SettingsRowLabel } from '../settings-screen/SettingRowLabel'
import { SettingsRow } from '../settings-screen/SettingsRow'
import { SettingsRowContent } from '../settings-screen/SettingsRowContent'

const flags = Object.keys(FeatureFlags) as FeatureFlags[]

const Stack = createNativeStackNavigator()

const screenOptionOverrides = { headerRight: () => null }

const getOverrideSetting = async (flag: string) => {
  const overrideSetting = await AsyncStorage.getItem(
    `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  )
  return overrideSetting as OverrideSetting
}

const setOverrideSetting = async (flag: string, val: OverrideSetting) => {
  const flagKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  if (val === null) {
    return await AsyncStorage.removeItem(flagKey)
  }

  await AsyncStorage.setItem(flagKey, val)
}

const messages = {
  title: 'Feature Flags',
  filterPlaceholder: 'Filter Feature Flags'
}

type FeatureFlagRowProps = {
  featureFlag: FeatureFlags
  onSelectOption: () => void
}

const FeatureFlagRow = (props: FeatureFlagRowProps) => {
  const { featureFlag, onSelectOption } = props
  const flag = FeatureFlags[featureFlag]
  const isEnabled = remoteConfigInstance.getFeatureEnabled(flag)
  const { value, loading } = useAsync(() => getOverrideSetting(flag), [])

  const options = [
    {
      key: null,
      text: `Default (${isEnabled ? 'Enabled' : 'Disabled'})`
    },
    { key: 'enabled', text: 'Enabled' },
    { key: 'disabled', text: 'Disabled' }
  ]

  const handleSelectOption = useCallback(
    (option: OverrideSetting) => {
      setOverrideSetting(flag, option)
      onSelectOption()
    },
    [flag, onSelectOption]
  )

  return (
    <SettingsRow>
      <SettingsRowLabel label={featureFlag} />
      <SettingsRowContent>
        {loading ? null : (
          <SegmentedControl
            defaultSelected={value}
            options={options}
            onSelectOption={handleSelectOption}
            fullWidth
          />
        )}
      </SettingsRowContent>
    </SettingsRow>
  )
}

const FeatureFlagScreen = () => {
  const navigation = useNavigation()
  const [filter, setFilter] = useState('')
  const [isFlagChanged, setIsFlagChanged] = useState(false)

  const handleFlagChange = useCallback(() => {
    setIsFlagChanged(true)
  }, [])

  const filteredFlags = useMemo(() => {
    return filter ? fuzzySearch(filter, flags, 3) : flags
  }, [filter])

  return (
    <Screen
      variant='secondary'
      title={messages.title}
      icon={IconEmbed}
      topbarRight={
        isFlagChanged ? (
          <TextButton
            variant='primary'
            onPress={() => RNRestart.Restart()}
            title='Restart'
          />
        ) : null
      }
      topbarLeft={
        <TopBarIconButton icon={IconClose} onPress={navigation.goBack} />
      }
    >
      <FlatList
        ListHeaderComponent={
          <FilterInput
            placeholder={messages.filterPlaceholder}
            onChangeText={setFilter}
          />
        }
        data={filteredFlags}
        renderItem={({ item }) => (
          <FeatureFlagRow
            key={item}
            featureFlag={item}
            onSelectOption={handleFlagChange}
          />
        )}
      />
    </Screen>
  )
}

export const FeatureFlagOverrideScreen = () => {
  const screenOptions = useAppScreenOptions(screenOptionOverrides)

  return (
    <ModalScreen>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name='FeatureFlagDrawer' component={FeatureFlagScreen} />
      </Stack.Navigator>
    </ModalScreen>
  )
}
