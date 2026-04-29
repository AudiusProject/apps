import { ID } from '~/models/Identifiers'

export const RESET = 'TRACK_PAGE/RESET'
export const SET_TRACK_ID = 'TRACK_PAGE/SET_TRACK_ID'
export const SET_TRACK_PERMALINK = 'TRACK_PAGE/SET_TRACK_PERMALINK'
export const MAKE_TRACK_PUBLIC = 'TRACK_PAGE/MAKE_TRACK_PUBLIC'

export const GO_TO_REMIXES_OF_PARENT_PAGE =
  'TRACK_PAGE/GO_TO_REMIXES_OF_PARENT_PAGE'

export type ResetAction = {
  type: typeof RESET
}

export type SetTrackIdAction = {
  type: typeof SET_TRACK_ID
  trackId: ID
}

export type SetTrackPermalinkAction = {
  type: typeof SET_TRACK_PERMALINK
  permalink: string
}

export type MakeTrackPublicAction = {
  type: typeof MAKE_TRACK_PUBLIC
  trackId: ID
}

export type TrackPageAction =
  | ResetAction
  | SetTrackIdAction
  | SetTrackPermalinkAction
  | MakeTrackPublicAction

export const resetTrackPage = (): ResetAction => ({ type: RESET })
export const setTrackId = (trackId: ID): SetTrackIdAction => ({
  type: SET_TRACK_ID,
  trackId
})
export const setTrackPermalink = (
  permalink: string
): SetTrackPermalinkAction => ({
  type: SET_TRACK_PERMALINK,
  permalink
})
export const makeTrackPublic = (trackId: ID): MakeTrackPublicAction => ({
  type: MAKE_TRACK_PUBLIC,
  trackId
})
