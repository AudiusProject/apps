import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'

import { useCanSendMessage } from '@audius/common/hooks'
import { ChatPermissionAction } from '@audius/common/store'
import { CHAT_BLOG_POST_URL } from '@audius/common/utils'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'

import { Text, TextLink } from '@audius/harmony-native'
import { UserLink } from 'app/components/user-link'
import { setVisibility } from 'app/store/drawers/slice'
import { makeStyles } from 'app/styles'

const messages = {
  noAction: (user?: ReactNode) => (
    <Text>You can&apos;t send messages to {user}. </Text>
  ),
  follow: (user: ReactNode) => (
    <Text>You must follow {user} before you can send them messages.</Text>
  ),
  blockee: 'You cannot send messages to users you have blocked. ',
  learnMore: 'Learn More.',
  unblockUser: 'Unblock User'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: spacing(19),
    paddingHorizontal: spacing(6)
  },
  empty: {
    height: spacing(10.5)
  }
}))

type ChatUnavailableProps = {
  chatId: string
}

export const ChatUnavailable = ({ chatId }: ChatUnavailableProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()

  const { firstOtherUser: otherUser, callToAction } = useCanSendMessage(chatId)

  const handleUnblockPress = useCallback(() => {
    if (otherUser) {
      dispatch(
        setVisibility({
          drawer: 'BlockMessages',
          visible: true,
          data: { userId: otherUser.user_id }
        })
      )
    }
  }, [dispatch, otherUser])

  const mapChatPermissionActionToContent = useMemo(() => {
    return {
      [ChatPermissionAction.NONE]: () => (
        <>
          {messages.noAction(otherUser?.name)}
          <TextLink url={CHAT_BLOG_POST_URL}>{messages.learnMore}</TextLink>
        </>
      ),
      [ChatPermissionAction.FOLLOW]: () =>
        otherUser ? (
          <>
            {messages.follow(
              <UserLink
                textVariant='body'
                userId={otherUser.user_id}
                textLinkStyle={{ lineHeight: 0 }}
              />
            )}
          </>
        ) : null,
      [ChatPermissionAction.UNBLOCK]: () => (
        <Text>
          {messages.blockee}
          <TextLink variant='visible' onPress={handleUnblockPress}>
            {messages.unblockUser}
          </TextLink>
        </Text>
      ),
      [ChatPermissionAction.WAIT]: () => <View style={styles.empty} />
    }
  }, [otherUser, styles.empty, handleUnblockPress])

  if (!callToAction) return null

  return (
    <View style={styles.root}>
      {mapChatPermissionActionToContent[callToAction]()}
    </View>
  )
}
