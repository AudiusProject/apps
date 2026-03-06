import type { ReactNode } from 'react'
import { useContext, useCallback } from 'react'

import { TouchableOpacity } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'
import type { IconComponent } from '@audius/harmony-native'
import type { TextProps } from 'app/components/core'
import type { ContextualParams } from 'app/hooks/useNavigation'
import type { AppTabScreenParamList } from 'app/screens/app-screen'
import { useAppTabNavigation } from 'app/screens/app-screen'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { AppDrawerContext } from '../AppDrawerContext'

const useStyles = makeStyles(({ spacing, palette }) => ({
  accountListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(4)
  },
  notificationBubble: {
    position: 'absolute',
    top: spacing(-1),
    right: spacing(2),
    height: spacing(4),
    width: spacing(4),
    borderRadius: spacing(3),
    borderWidth: spacing(0.5),
    borderColor: palette.white,
    backgroundColor: palette.primary
  }
}))

type LeftNavLinkProps<Screen extends keyof AppTabScreenParamList> = {
  icon: IconComponent
  to: Screen
  params?: AppTabScreenParamList[Screen] extends undefined
    ? ContextualParams | null
    : AppTabScreenParamList[Screen] & ContextualParams
  label: string
  labelProps?: TextProps
  children?: ReactNode
  onPress?: () => void
  showNotificationBubble?: boolean
}

export const LeftNavLink = <Screen extends keyof AppTabScreenParamList>(
  props: LeftNavLinkProps<Screen>
) => {
  const {
    icon: Icon,
    to,
    params,
    label,
    children,
    onPress,
    showNotificationBubble
  } = props
  const styles = useStyles()
  const { neutral } = useThemeColors()
  const navigation = useAppTabNavigation()
  const { drawerHelpers } = useContext(AppDrawerContext)

  const handlePress = useCallback(() => {
    // @ts-expect-error navigation not smart enough here
    navigation.navigate(to, { fromAppDrawer: true, ...params })
    drawerHelpers.closeDrawer()
    onPress?.()
  }, [navigation, to, params, drawerHelpers, onPress])

  return (
    <TouchableOpacity style={styles.accountListItem} onPress={handlePress}>
      <Flex row justifyContent='space-between' alignItems='center' w='100%'>
        <Flex row alignItems='center'>
          <Flex w='unit10'>
            <Icon fill={neutral} size='l' />
            {showNotificationBubble ? (
              <Flex style={styles.notificationBubble} />
            ) : null}
          </Flex>
          <Text variant='title' size='l' strength='weak'>
            {label}
          </Text>
        </Flex>
        {children}
      </Flex>
    </TouchableOpacity>
  )
}
