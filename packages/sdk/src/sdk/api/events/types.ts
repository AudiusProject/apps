import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { EventEventTypeEnum, EventEntityTypeEnum } from '../generated/default'

export type EventsApiServicesConfig = {
  entityManager?: EntityManagerService
}

export const EventMetadataSchema = z.object({
  userId: z.number(),
  eventId: z.number(),
  eventType: z.nativeEnum(EventEventTypeEnum).optional(),
  entityType: z.nativeEnum(EventEntityTypeEnum).optional(),
  entityId: z.number().optional(),
  endDate: z.string().optional(), // ISO format date string
  eventData: z.record(z.any()).optional()
})

export const CreateEventSchema = EventMetadataSchema.omit({
  eventId: true
}).extend({
  eventId: z.number().optional()
})

export const UpdateEventSchema = EventMetadataSchema.pick({
  userId: true,
  eventId: true,
  endDate: true,
  eventData: true
})

export const DeleteEventSchema = EventMetadataSchema.pick({
  userId: true,
  eventId: true
})

export const EntityManagerFollowEventSchema = z.object({
  userId: z.number(),
  eventId: z.number()
})

export const EntityManagerUnfollowEventSchema = EntityManagerFollowEventSchema

export type CreateEventRequest = z.infer<typeof CreateEventSchema>
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>
export type DeleteEventRequest = z.infer<typeof DeleteEventSchema>
export type EntityManagerFollowEventRequest = z.infer<
  typeof EntityManagerFollowEventSchema
>
export type EntityManagerUnfollowEventRequest = z.infer<
  typeof EntityManagerUnfollowEventSchema
>
