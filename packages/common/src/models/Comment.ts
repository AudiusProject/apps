import {
  Comment as CommentSDK,
  ReplyComment as ReplyCommentSDK
} from '@audius/sdk/services'
import type { OverrideProperties } from 'type-fest'

import { Maybe } from '~/utils/typeUtils'

import { ID } from './Identifiers'

export type ReplyComment = OverrideProperties<
  ReplyCommentSDK,
  { id: ID; userId: ID; entityId: ID }
>

export type Comment = OverrideProperties<
  CommentSDK,
  {
    id: ID
    userId: ID | undefined
    entityId: ID
    replies: Maybe<ReplyComment[]>
  }
>
