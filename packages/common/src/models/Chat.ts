import type { ChatMessage, UnfurlResponse } from '@audius/sdk/services'

import { Status } from '~/models'

export type ChatMessageWithExtras = ChatMessage & {
  status?: Status
  hasTail: boolean
  unfurlMetadata?: Partial<UnfurlResponse>
}
