import type { ID } from '~/models/Identifiers'

type TrackCollaborator = {
  user_id: ID
}

type TrackWithCollaborators = {
  collaborators?: TrackCollaborator[] | null
}

export const getAcceptedTrackCollaborationStorageKey = (
  userId: ID,
  trackId: ID
) => `accepted-track-collaboration:${userId}:${trackId}`

export const isAcceptedTrackCollaborationStorageValue = (
  value: string | null | undefined
) => value === 'true'

export const isTrackCollaborationAccepted = (
  track: TrackWithCollaborators | null | undefined,
  userId: ID | null | undefined
) => {
  return (
    !!userId &&
    !!track?.collaborators?.some(
      (collaborator) => collaborator.user_id === userId
    )
  )
}
