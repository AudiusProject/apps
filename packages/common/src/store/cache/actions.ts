import { Kind } from '~/models/Kind'

import { SubscriberInfo } from './types'

export const SUBSCRIBE = 'CACHE/SUBSCRIBE'

export const subscribe = (kind: Kind, subscribers: SubscriberInfo[]) => ({
  type: SUBSCRIBE,
  kind,
  subscribers
})
