import type { LinkEntity } from '@audius/common/hooks'
import type { ID, UserMetadata } from '@audius/common/models'
import type { CommentMention, EntityType } from '@audius/sdk/services'
import type { TextInput, TextStyle, ViewStyle } from 'react-native'

import type { StylesProp } from 'app/styles'

import type { TextInputProps } from '../core'

export type ComposerInputProps = {
  messageId: number
  entityId?: ID
  entityType?: EntityType
  onChange?: (value: string, linkEntities: LinkEntity[]) => void
  onFocus?: () => void
  onAddMention?: (mentionUserId: ID) => void
  onAddTimestamp?: (timestamp: number) => void
  onAddLink?: (entityId: ID, kind: 'track' | 'collection' | 'user') => void
  onSubmit?: (value: string, mentions: CommentMention[]) => void
  onAutocompleteChange?: (isActive: boolean, value: string) => void
  setAutocompleteHandler?: (handler: (user: UserMetadata) => void) => void
  presetMessage?: string
  presetUserMentions?: CommentMention[]
  isLoading?: boolean
  styles?: StylesProp<{
    container: ViewStyle
    input: TextStyle
  }>
  TextInputComponent?: typeof TextInput
  maxMentions?: number
} & Pick<
  TextInputProps,
  'maxLength' | 'placeholder' | 'onPressIn' | 'readOnly' | 'id' | 'onLayout'
>
