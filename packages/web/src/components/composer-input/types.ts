import { LinkEntity } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { TextAreaProps } from '@audius/harmony'
import { CommentMention, EntityType } from '@audius/sdk'

export type ComposerInputProps = {
  messageId: number
  entityId?: ID
  entityType?: EntityType
  onChange?: (value: string, linkEntities: LinkEntity[]) => void
  onSubmit?: (
    value: string,
    linkEntities: LinkEntity[],
    mentions: CommentMention[]
  ) => void
  blurOnSubmit?: boolean
  onAddMention?: (mentionUserId: ID) => void
  onAddTimestamp?: (timestamp: number) => void
  onAddLink?: (entityId: ID, kind: 'track' | 'collection' | 'user') => void
  presetMessage?: string
  presetUserMentions?: CommentMention[]
  isLoading?: boolean
  maxMentions?: number
} & Pick<
  TextAreaProps,
  | 'name'
  | 'maxLength'
  | 'placeholder'
  | 'onClick'
  | 'disabled'
  | 'readOnly'
  | 'id'
  | 'autoFocus'
>
