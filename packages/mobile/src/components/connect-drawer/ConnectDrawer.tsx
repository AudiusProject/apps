import { useCallback, useEffect } from 'react'

import { castSelectors } from '@audius/common/store'
import { Linking, Platform, Pressable, View } from 'react-native'
import GoogleCast, { useDevices } from 'react-native-google-cast'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'

import {
  Divider,
  Flex,
  IconCast,
  IconCheck,
  IconSpeaker,
  Text,
  useTheme
} from '@audius/harmony-native'
import { useAirplay } from 'app/components/audio/Airplay'
import { NativeDrawer } from 'app/components/drawer'
import { useDrawer } from 'app/hooks/useDrawer'

const { getIsCasting, getMethod, getDeviceName } = castSelectors

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
  const method = useSelector(getMethod)
  const activeDeviceName = useSelector(getDeviceName)
  const devices = useDevices()
  const { openAirplayDialog } = useAirplay()

  // The Cast framework only auto-discovers when a native CastButton /
  // MediaRouterButton is in the hierarchy. Since this drawer renders its
  // own device list instead, kick off discovery explicitly on iOS when
  // the drawer opens. (Android's MediaRouter is started via CastContext
  // init in MainActivity.kt and doesn't expose a startDiscovery method.)
  useEffect(() => {
    if (!IS_IOS) return
    const discovery = GoogleCast.getDiscoveryManager()
    discovery.startDiscovery().catch(() => {})
    return () => {
      discovery.stopDiscovery().catch(() => {})
    }
  }, [])

  const handleSelectThisDevice = useCallback(() => {
    if (method === 'chromecast') {
      GoogleCast.getSessionManager().endCurrentSession()
    } else if (method === 'airplay') {
      // iOS doesn't allow programmatic AirPlay disconnect — open the
      // system picker so the user can route back to the iPhone.
      openAirplayDialog()
    }
    onClose()
  }, [method, openAirplayDialog, onClose])

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
      // Pre-mute the local player so any active AirPlay route plays silence
      // immediately rather than continuing to bleed audio while the
      // chromecast session is being established. GoogleCast.tsx also sets
      // volume=0 on CONNECTING, but that fires async after startSession; the
      // pre-mute closes the gap so AirPlay doesn't briefly play in parallel.
      TrackPlayer.setVolume(0).catch(() => {})
      // If the user was AirPlaying, open the AirPlay picker so they can
      // route back to iPhone — iOS doesn't allow programmatic disconnect.
      if (method === 'airplay') {
        openAirplayDialog()
      }
      GoogleCast.getSessionManager()
        .startSession(deviceId)
        .catch(() => {})
      onClose()
    },
    [method, openAirplayDialog, onClose]
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
          active={method === 'airplay'}
          onPress={handleSelectAirplayOrBluetooth}
        />
        <Divider orientation='horizontal' />

        {devices.map((device) => {
          const isActive = Boolean(
            method === 'chromecast' && activeDeviceName === device.friendlyName
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
