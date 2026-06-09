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
    /** Canonical contest permalink (e.g. /{handle}/contest-title).
     *  Set once the API returns a permalink field from event_routes.
     *  Optional - consumers fall back to deriving the URL from the
     *  associated track's permalink when this is absent. */
    permalink?: string
  }
>
