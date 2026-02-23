import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { HashId } from '../../types/HashId'

export type NotificationsApiServicesConfig = {
  entityManager?: EntityManagerService
}

export const MarkAllNotificationsAsViewedSchema = z.object({
  userId: HashId
})

export type MarkAllNotificationsAsViewedRequest = z.input<
  typeof MarkAllNotificationsAsViewedSchema
>

export const UpdatePlaylistLastViewedAtSchema = z.object({
  playlistId: HashId,
  userId: HashId
})

export type UpdatePlaylistLastViewedAtRequest = z.input<
  typeof UpdatePlaylistLastViewedAtSchema
>

export const CreateNotificationSchema = z.object({
  data: z.any()
})

export type CreateNotificationRequest = z.input<typeof CreateNotificationSchema>
