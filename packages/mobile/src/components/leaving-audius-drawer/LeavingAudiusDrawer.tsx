import React from 'react'

import { useLeavingAudiusModal } from '@audius/common/store'
import { View } from 'react-native'

import {
  Hint,
  IconExternalLink,
  IconInfo,
  Button
} from '@audius/harmony-native'
import { Text, useLink } from 'app/components/core'
import Drawer from 'app/components/drawer/Drawer'
import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'

const messages = {
  title: 'Are You Sure?',
  content: 'This link is taking you to the following website',
  visit: 'Visit Site',
  back: 'Go Back'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    gap: spacing(4),
    paddingBottom: spacing(6),
    paddingHorizontal: spacing(4)
  }
}))

export const LeavingAudiusDrawer = () => {
  const styles = useStyles()
  const { isOpen, data, onClose, onClosed } = useLeavingAudiusModal()
  const { link } = data
  const { onPress: onLinkPress } = useLink(link)
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      title={messages.title}
      titleIcon={IconInfo}
      zIndex={zIndex.LEAVING_AUDIUS_DRAWER}
    >
      <View style={styles.root}>
        <Text>{messages.content}</Text>
        <Hint icon={IconExternalLink}>{link}</Hint>
        <Button onPress={onLinkPress} fullWidth>
          {messages.visit}
        </Button>
        <Button variant='secondary' onPress={onClose} fullWidth>
          {messages.back}
        </Button>
      </View>
    </Drawer>
  )
}
