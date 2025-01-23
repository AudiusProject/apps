import { Id } from '@audius/sdk'

import { ID } from '~/models/Identifiers'

export const makeChatId = (userIds: ID[]) => {
  return userIds
    .map((id) => Id.parse(id))
    .sort()
    .join(':')
}
