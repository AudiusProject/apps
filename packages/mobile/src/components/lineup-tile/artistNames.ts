import type { ID } from '@audius/common/models'

export type ArtistNameCollaborator = {
  user_id: ID
  name?: string | null
}

export const getTrackArtistNames = (
  userName: string,
  collaborators?: ArtistNameCollaborator[] | null
) => {
  const collaboratorNames =
    collaborators?.map((collaborator) => collaborator.name).filter(Boolean) ??
    []

  return [userName, ...collaboratorNames].join(', ')
}
