import React, { useCallback } from 'react'

import {
  useCurrentCommentSection,
  useGetTrackCommentNotificationSetting,
  useUpdateTrackCommentNotificationSetting
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { Portal } from '@gorhom/portal'
import { useKeyboard } from '@react-native-community/hooks'
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native'
import { useToggle } from 'react-use'

import {
  Flex,
  IconButton,
  IconCloseAlt,
  IconKebabHorizontal,
  IconRefresh,
  PlainButton,
  Text
} from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'

import { ActionDrawerWithoutRedux } from '../action-drawer'

import { CommentSortBar } from './CommentSortBar'

type CommentDrawerHeaderProps = {
  minimal?: boolean
}

export const CommentDrawerHeader = (props: CommentDrawerHeaderProps) => {
  const { minimal = false } = props
  const { toast } = useToast()

  const {
    commentCount,
    hasNewComments,
    currentUserId,
    artistId,
    entityId,
    resetComments,
    closeDrawer
  } = useCurrentCommentSection()
  const isOwner = currentUserId === artistId
  const isMuted = useGetTrackCommentNotificationSetting(entityId)

  const [muteTrackCommentNotifications] =
    useUpdateTrackCommentNotificationSetting(entityId)

  const [isNotificationActionDrawerOpen, toggleNotificationActionDrawer] =
    useToggle(false)

  const handleUpdateNotificationSetting = () => {
    muteTrackCommentNotifications(isMuted ? 'unmute' : 'mute')
    toast({
      content: isMuted
        ? messages.toasts.unmutedTrackNotifs
        : messages.toasts.mutedTrackNotifs
    })
  }

  const handlePressOverflowMenu = () => {
    toggleNotificationActionDrawer()
  }

  const showCommentSortBar = commentCount !== undefined && commentCount > 1

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss()
  }, [])

  const { keyboardShown } = useKeyboard()

  return (
    <>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View>
          <View pointerEvents={keyboardShown ? 'none' : undefined}>
            <Flex p='l' gap='m'>
              <Flex
                direction='row'
                w='100%'
                justifyContent='space-between'
                alignItems='center'
              >
                <Flex direction='row' gap='m' alignItems='center'>
                  <Text
                    variant='title'
                    size={minimal ? 'l' : 'm'}
                    strength='weak'
                  >
                    {messages.title}
                    <Text color='subdued'>&nbsp;({commentCount})</Text>
                  </Text>

                  {hasNewComments ? (
                    <PlainButton
                      iconLeft={IconRefresh}
                      variant='subdued'
                      onPress={resetComments}
                    >
                      {messages.newComments}
                    </PlainButton>
                  ) : null}
                </Flex>
                <IconButton
                  icon={isOwner ? IconKebabHorizontal : IconCloseAlt}
                  onPress={isOwner ? handlePressOverflowMenu : closeDrawer}
                  color='subdued'
                  size='m'
                />
              </Flex>
              {showCommentSortBar && !minimal ? <CommentSortBar /> : null}
            </Flex>
          </View>
        </View>
      </TouchableWithoutFeedback>
      {isOwner ? (
        <Portal hostName='DrawerPortal'>
          <ActionDrawerWithoutRedux
            isOpen={isNotificationActionDrawerOpen}
            onClose={toggleNotificationActionDrawer}
            rows={[
              {
                text: isMuted
                  ? messages.popups.trackNotifications.unmute
                  : messages.popups.trackNotifications.mute,
                callback: handleUpdateNotificationSetting,
                style: { textAlign: 'center' }
              }
            ]}
          />
        </Portal>
      ) : null}
    </>
  )
}
