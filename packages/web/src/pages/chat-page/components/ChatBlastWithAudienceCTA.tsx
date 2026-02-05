import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useCanSendChatBlast } from '@audius/common/hooks'
import { chatActions, followersUserListSelectors } from '@audius/common/store'
import {
  Box,
  Flex,
  Text,
  IconTowerBroadcast,
  IconCaretRight,
  useTheme
} from '@audius/harmony'
import { ChatBlastAudience } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'

const { createChatBlast } = chatActions

const getMessages = (audience: ChatBlastAudience) => {
  if (audience === ChatBlastAudience.FOLLOWERS) {
    return {
      title: 'Message Blast Your Followers',
      description: 'Send bulk messages to your followers.'
    }
  }
  return null
}

type ChatBlastWithAudienceCTAProps = {
  audience: ChatBlastAudience
  onClick?: () => void
}

export const ChatBlastWithAudienceCTA = (
  props: ChatBlastWithAudienceCTAProps
) => {
  const { audience, onClick } = props
  const messages = getMessages(audience)
  const { color } = useTheme()
  const { data: currentUserId } = useCurrentUserId()

  const followersUserId = useSelector(followersUserListSelectors.getId)
  const targetUserId = followersUserId

  const isOwner = currentUserId === targetUserId

  const dispatch = useDispatch()
  const handleClick = useCallback(() => {
    dispatch(createChatBlast({ audience }))
    onClick?.()
  }, [audience, dispatch, onClick])

  const userMeetsRequirements = useCanSendChatBlast()
  if (!userMeetsRequirements || !messages || !isOwner) {
    return null
  }

  return (
    <Box
      backgroundColor='surface1'
      ph='xl'
      pv='l'
      borderTop='strong'
      css={{
        ':hover': {
          backgroundColor: color.background.surface2
        }
      }}
      onClick={handleClick}
    >
      <Flex alignItems='center' gap='l' justifyContent='space-between'>
        <Flex alignItems='center' gap='s'>
          <IconTowerBroadcast size='3xl' color='default' />
          <Flex direction='column' gap='xs'>
            <Text variant='title'>{messages.title}</Text>
            <Text size='s'>{messages.description}</Text>
          </Flex>
        </Flex>
        <IconCaretRight size='s' color='default' />
      </Flex>
    </Box>
  )
}
