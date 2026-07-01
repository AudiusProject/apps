import { Event as EventSDK } from '@audius/sdk'
import type { OverrideProperties } from 'type-fest'

import { Nullable } from '../utils/typeUtils'

import { ID } from './Identifiers'

export type Event = OverrideProperties<
  EventSDK,
  {
    eventId: ID
    userId: ID
    entityId: Nullable<ID>
  }
>
