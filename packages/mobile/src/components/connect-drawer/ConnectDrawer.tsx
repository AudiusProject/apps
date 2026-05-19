import { useCallback } from 'react'

import { castSelectors } from '@audius/common/store'
import { Linking, Platform, Pressable, View } from 'react-native'
import GoogleCast, { useDevices } from 'react-native-google-cast'
import { useSelector } from 'react-redux'

import {
  Flex,
  IconCast,
  IconCheck,
  IconSpeaker,
  Text,
  useTheme
} from '@audius/harmony-native'
import { NativeDrawer } from 'app/components/drawer'
import { useAirplay } from 'app/components/audio/Airplay'
import { useDrawer } from 'app/hooks/useDrawer'

const { getIsCasting, getDeviceName } = castSelectors

const DRAWER_NAME = 'Connect'
const IS_IOS = Platform.OS === 'ios'

const messages = {
  title: 'Connect',
  thisDevice: 'This Device',
  airplayBluetooth: 'AirPlay & Bluetooth',
  bluetooth: 'Bluetooth',
  noDevices: 'Searching for cast devices…'
}

type RowProps = {
  label: string
  icon: typeof IconSpeaker
  active?: boolean
  onPress: () => void
}

const Row = ({ label, icon: Icon, active, onPress }: RowProps) => {
  const { color, spacing } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        paddingVertical: spacing.m,
        gap: spacing.m,
        backgroundColor: pressed ? color.background.surface2 : 'transparent'
      })}
    >
      <Icon size='l' color={active ? 'accent' : 'default'} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant='title'
          size='m'
          strength='default'
          color={active ? 'accent' : 'default'}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      {active ? <IconCheck size='s' color='accent' /> : null}
    </Pressable>
  )
}

export const ConnectDrawer = () => {
  const { onClose } = useDrawer(DRAWER_NAME)
  const isCasting = useSelector(getIsCasting)
  const activeDeviceName = useSelector(getDeviceName)
  const devices = useDevices()
  const { openAirplayDialog } = useAirplay()

  const handleSelectThisDevice = useCallback(() => {
    if (isCasting) {
      GoogleCast.getSessionManager().endCurrentSession()
    }
    onClose()
  }, [isCasting, onClose])

  const handleSelectAirplayOrBluetooth = useCallback(() => {
    if (IS_IOS) {
      openAirplayDialog()
    } else {
      // Open Android system Bluetooth picker. Fall back to general settings
      // if the intent action isn't handled.
      Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {
        Linking.openSettings().catch(() => {})
      })
    }
    onClose()
  }, [openAirplayDialog, onClose])

  const handleSelectCastDevice = useCallback(
    (deviceId: string) => {
      GoogleCast.getSessionManager()
        .startSession(deviceId)
        .catch(() => {})
      onClose()
    },
    [onClose]
  )

  return (
    <NativeDrawer
      drawerName={DRAWER_NAME}
      title={messages.title}
      titleIcon={IconCast}
    >
      <Flex direction='column' pb='l'>
        <Row
          label={messages.thisDevice}
          icon={IconSpeaker}
          active={!isCasting}
          onPress={handleSelectThisDevice}
        />
        <Row
          label={IS_IOS ? messages.airplayBluetooth : messages.bluetooth}
          icon={IconSpeaker}
          onPress={handleSelectAirplayOrBluetooth}
        />

        {devices.map((device) => {
          const isActive = Boolean(
            isCasting && activeDeviceName === device.friendlyName
          )
          return (
            <Row
              key={device.deviceId}
              label={device.friendlyName}
              icon={IconSpeaker}
              active={isActive}
              onPress={() => handleSelectCastDevice(device.deviceId)}
            />
          )
        })}

        {devices.length === 0 ? (
          <Flex pv='l' alignItems='center'>
            <Text variant='body' size='m' color='subdued'>
              {messages.noDevices}
            </Text>
          </Flex>
        ) : null}
      </Flex>
    </NativeDrawer>
  )
}
