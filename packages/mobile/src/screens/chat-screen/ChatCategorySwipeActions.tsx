import { useCallback } from 'react'

import { chatActions } from '@audius/common/store'
import { ChatCategory } from '@audius/sdk'
import { TouchableOpacity } from 'react-native'
import { useDispatch } from 'react-redux'

import { Flex, IconMessages, IconStar, Text } from '@audius/harmony-native'
import { useThemePalette } from 'app/utils/theme'

const { setChatCategory } = chatActions

const messages = {
  priority: 'Priority',
  general: 'General',
  moveToPriority: 'Move to Priority',
  moveToGeneral: 'Move to General'
}

const ACTION_WIDTH = 88

type ChatCategorySwipeActionsProps = {
  chatId: string
  category: ChatCategory | null
  /** Called after an action is chosen so the row can close */
  onAction: () => void
}

/**
 * The actions revealed by swiping a chat row: one button per inbox category
 * the chat is not already in.
 */
export const ChatCategorySwipeActions = ({
  chatId,
  category,
  onAction
}: ChatCategorySwipeActionsProps) => {
  const dispatch = useDispatch()
  const palette = useThemePalette()

  const handleMoveToPriority = useCallback(() => {
    onAction()
    dispatch(setChatCategory({ chatId, category: ChatCategory.PRIORITY }))
  }, [chatId, dispatch, onAction])

  const handleMoveToGeneral = useCallback(() => {
    onAction()
    dispatch(setChatCategory({ chatId, category: ChatCategory.GENERAL }))
  }, [chatId, dispatch, onAction])

  return (
    <Flex direction='row' h='100%'>
      {category !== ChatCategory.PRIORITY ? (
        <TouchableOpacity
          onPress={handleMoveToPriority}
          accessibilityRole='button'
          accessibilityLabel={messages.moveToPriority}
          style={{ width: ACTION_WIDTH, backgroundColor: palette.secondary }}
        >
          <Flex flex={1} alignItems='center' justifyContent='center' gap='xs'>
            <IconStar color='white' size='m' />
            <Text variant='label' size='xs' color='white'>
              {messages.priority}
            </Text>
          </Flex>
        </TouchableOpacity>
      ) : null}
      {category !== ChatCategory.GENERAL ? (
        <TouchableOpacity
          onPress={handleMoveToGeneral}
          accessibilityRole='button'
          accessibilityLabel={messages.moveToGeneral}
          style={{ width: ACTION_WIDTH, backgroundColor: palette.neutral }}
        >
          <Flex flex={1} alignItems='center' justifyContent='center' gap='xs'>
            <IconMessages color='white' size='m' />
            <Text variant='label' size='xs' color='white'>
              {messages.general}
            </Text>
          </Flex>
        </TouchableOpacity>
      ) : null}
    </Flex>
  )
}
