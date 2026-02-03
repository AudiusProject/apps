import { useCallback } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { useTierAndVerifiedForUser } from '@audius/common/store'
import { css } from '@emotion/native'
import { useTheme } from '@emotion/react'
import { pick } from 'lodash'
import { View } from 'react-native'

import { Flex, IconVerified, Text } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import type { ProfileTabScreenParamList } from '../app-screen/ProfileTabScreen'

import { SettingsRow } from './SettingsRow'

const useStyles = makeStyles(({ typography, spacing, palette }) => ({
  root: { paddingVertical: spacing(4) },
  content: { flexDirection: 'row', alignItems: 'center' },
  profilePicture: { height: 52, width: 52 },
  info: { marginLeft: spacing(4) }
  // handle: {
  //   ...typography.h2,
  //   color: palette.neutral,
  //   fontFamily: typography.fontByWeight.medium
  // }
}))

export const AccountSettingsRow = () => {
  const styles = useStyles()
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => pick(user, ['user_id', 'handle', 'name'])
  })
  const { user_id, handle, name } = accountData ?? {}
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { spacing } = useTheme()
  const { isVerified } = useTierAndVerifiedForUser(user_id)

  // Calculate badge size based on h2 font size (h2 is fontSize.medium = 16, so badge is 14)
  const badgeSize = 14

  const handlePress = useCallback(() => {
    navigation.push('AccountSettingsScreen')
  }, [navigation])

  if (!user_id) return null

  return (
    <SettingsRow style={styles.root} onPress={handlePress}>
      <View style={styles.content}>
        <ProfilePicture
          userId={user_id}
          style={css({ width: spacing.unit13, height: spacing.unit13 })}
          borderWidth='thin'
        />
        <View style={styles.info}>
          <Flex row gap='xs' alignItems='center'>
            <Text variant='title' size='m'>
              {name}
            </Text>
            {isVerified ? (
              <IconVerified height={badgeSize} width={badgeSize} />
            ) : null}
          </Flex>
          <Text variant='body' size='s'>
            @{handle}
          </Text>
        </View>
      </View>
    </SettingsRow>
  )
}
