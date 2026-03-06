import React, { useCallback } from 'react'

import { useCanSendChatBlast } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import { playerSelectors } from '@audius/common/store'
import { TouchableHighlight } from 'react-native-gesture-handler'
import { useSelector } from 'react-redux'

import {
  Box,
  Flex,
  Text,
  IconTowerBroadcast,
  IconCaretRight
} from '@audius/harmony-native'
import { KeyboardAvoidingView } from 'app/components/core'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer/constants'
import { make, track } from 'app/services/analytics'

import { useAppTabNavigation } from '../app-screen'

import { useKeyboardAvoidingPlaybarStyle } from './hooks/useKeyboardAvoidingPlaybarStyle'

const { getHasTrack } = playerSelectors

const CTA_HEIGHT = 80

const messages = {
  title: 'Send a Message Blast',
  description: 'Send messages to your fans in bulk.',
  badgeRequired: 'Badge Required',
  or: 'or'
}

export const ChatBlastCTA = () => {
  const navigation = useAppTabNavigation()
  const keyboardAvoidingPlaybarStyle = useKeyboardAvoidingPlaybarStyle()
  const hasCurrentlyPlayingTrack = useSelector(getHasTrack)

  const handleClick = useCallback(() => {
    navigation.navigate('CreateChatBlast')
    track(make({ eventName: Name.CHAT_BLAST_CTA_CLICKED }))
  }, [navigation])

  const userMeetsRequirements = useCanSendChatBlast()
  if (!userMeetsRequirements) {
    return null
  }

  const offset = CTA_HEIGHT + (hasCurrentlyPlayingTrack ? PLAY_BAR_HEIGHT : 0)

  return (
    <KeyboardAvoidingView
      keyboardShowingOffset={offset}
      style={keyboardAvoidingPlaybarStyle}
    >
      <TouchableHighlight onPress={handleClick}>
        <Box backgroundColor='surface1' ph='xl' pv='l' borderTop='strong'>
          <Flex
            direction='row'
            alignItems='center'
            gap='l'
            justifyContent='space-between'
          >
            <Flex direction='row' alignItems='center' gap='s'>
              <IconTowerBroadcast size='3xl' color='default' />
              <Flex direction='column' gap='xs'>
                <Text variant='title'>{messages.title}</Text>
                <Text size='s'>{messages.description}</Text>
              </Flex>
            </Flex>
            <IconCaretRight size='s' color='default' />
          </Flex>
        </Box>
      </TouchableHighlight>
    </KeyboardAvoidingView>
  )
}
