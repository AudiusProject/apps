import { useCallback, useState } from 'react'

import type { Nullable } from '@audius/common/utils'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, View } from 'react-native'
import InAppReview from 'react-native-in-app-review'

import {
  IconHeart,
  IconThumbsDown,
  IconThumbsUp,
  Button,
  Flex
} from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { NativeDrawer } from 'app/components/drawer'
import { RATE_CTA_STORAGE_KEY } from 'app/constants/storage-keys'
import { makeStyles } from 'app/styles'
import { isSolanaPhone } from 'app/utils/os'
import { SOLANA_DAPP_STORE_LINK } from 'app/utils/playStore'
import { useThemeColors } from 'app/utils/theme'

const DRAWER_NAME = 'RateCallToAction'

const messages = {
  drawerTitle: 'Enjoying the App?',
  cancelText: 'No',
  confirmText: 'Yes!',
  enjoyingText: 'Are You Enjoying Audius Music?',
  thankYouText: 'Thanks For The Feedback!'
}

const useStyles = makeStyles(({ palette, typography, spacing }) => ({
  contentContainer: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(4)
  },
  title: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingBottom: spacing(6)
  },
  titleIcon: {
    position: 'relative',
    top: 7,
    color: palette.neutral,
    marginRight: spacing(3)
  },
  titleText: {
    textTransform: 'uppercase',
    marginTop: spacing(4)
  },
  text: {
    textAlign: 'center',
    fontSize: typography.fontSize.large
  }
}))

export const RateCtaDrawer = () => {
  const styles = useStyles()
  const { neutralLight2 } = useThemeColors()
  const [userRateResponse, setUserRateResponse] =
    useState<Nullable<'YES' | 'NO'>>(null)

  const handleReviewConfirm = useCallback(() => {
    const isAvailable = isSolanaPhone ? true : InAppReview.isAvailable()
    setUserRateResponse('YES')
    AsyncStorage.setItem(RATE_CTA_STORAGE_KEY, 'YES')

    if (isAvailable) {
      if (isSolanaPhone) {
        Linking.openURL(SOLANA_DAPP_STORE_LINK)
      } else {
        InAppReview.RequestInAppReview()
          .then((hasFlowFinishedSuccessfully) => {
            // Do things after the popup shows up
          })
          .catch((error) => {
            console.error(error)
          })
      }
    }
  }, [])

  const handleReviewDeny = useCallback(() => {
    setUserRateResponse('NO')
    AsyncStorage.setItem(RATE_CTA_STORAGE_KEY, 'NO')
  }, [])

  return (
    <NativeDrawer drawerName={DRAWER_NAME}>
      <View style={styles.contentContainer}>
        <View style={styles.title}>
          <IconHeart
            style={styles.titleIcon}
            fill={neutralLight2}
            height={24}
            width={24}
          />
          <Text
            weight='heavy'
            color='neutralLight2'
            fontSize='xl'
            style={styles.titleText}
          >
            {messages.drawerTitle}
          </Text>
        </View>
        {userRateResponse !== null ? (
          <Text variant='body' style={styles.text}>
            {messages.thankYouText}
          </Text>
        ) : (
          <Flex gap='l'>
            <Text variant='body' style={styles.text}>
              {messages.enjoyingText}
            </Text>
            <Button
              iconLeft={IconThumbsUp}
              fullWidth
              variant='secondary'
              onPress={handleReviewConfirm}
            >
              {messages.confirmText}
            </Button>
            <Button
              iconLeft={IconThumbsDown}
              fullWidth
              variant='secondary'
              onPress={handleReviewDeny}
            >
              {messages.cancelText}
            </Button>
          </Flex>
        )}
      </View>
    </NativeDrawer>
  )
}
