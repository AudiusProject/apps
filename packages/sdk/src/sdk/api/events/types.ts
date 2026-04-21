import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { EventEventTypeEnum, EventEntityTypeEnum } from '../generated/default'

export type EventsApiServicesConfig = {
  entityManager?: EntityManagerService
}

// Base schema for event metadata
export const EventMetadataSchema = z.object({
  userId: z.number(),
  eventId: z.number(),
  eventType: z.nativeEnum(EventEventTypeEnum).optional(),
  entityType: z.nativeEnum(EventEntityTypeEnum).optional(),
  entityId: z.number().optional(),
  endDate: z.string().optional(), // ISO format date string
  eventData: z.record(z.any()).optional()
})

// Request schemas for each operation
export const CreateEventSchema = EventMetadataSchema.omit({
  eventId: true
}).extend({
  eventId: z.number().optional() // Make eventId optional for creation
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

// Entity-manager-shaped follow/unfollow: numeric IDs, submitted client-side
// through the entity manager. Distinct from the generated HTTP-shaped
// FollowEventRequest (which uses string hashids and hits /events/{id}/follow
// via OAuth auth). Mirrors the user-follow pattern in UsersApi.
export const EntityManagerFollowEventSchema = z.object({
  userId: z.number(),
  eventId: z.number()
})

export const EntityManagerUnfollowEventSchema = EntityManagerFollowEventSchema

// Request types
export type CreateEventRequest = z.infer<typeof CreateEventSchema>
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>
export type DeleteEventRequest = z.infer<typeof DeleteEventSchema>
export type EntityManagerFollowEventRequest = z.infer<
  typeof EntityManagerFollowEventSchema
>
export type EntityManagerUnfollowEventRequest = z.infer<
  typeof EntityManagerUnfollowEventSchema
>
