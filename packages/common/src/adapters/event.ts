import { Event as EventSDK, HashId, OptionalHashId } from '@audius/sdk/services'
import camelcaseKeys from 'camelcase-keys'

import { Event } from '~/models/Event'
import { dayjs } from '~/utils'

export const eventMetadataFromSDK = (input: EventSDK): Event | undefined => {
  const { eventId, userId, entityId, eventData, ...rest } = input

  const decodedEventId = HashId.parse(eventId)
  const decodedUserId = HashId.parse(userId)
  const decodedEntityId = entityId ? OptionalHashId.parse(entityId) : null

  if (!decodedEventId || !decodedUserId) {
    return undefined
  }

  const localEndDate = dayjs
    .utc(rest.endDate)
    .local()
    .format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')

  return {
    ...rest,
    eventData: camelcaseKeys(eventData),
    eventId: decodedEventId,
    userId: decodedUserId,
    entityId: decodedEntityId ?? null,
    endDate: localEndDate
  }
}

export const eventMetadataListFromSDK = (
  inputs: EventSDK[] | undefined
): Event[] => {
  if (!inputs) return []
  return inputs
    .map(eventMetadataFromSDK)
    .filter((event): event is Event => event !== undefined)
}
