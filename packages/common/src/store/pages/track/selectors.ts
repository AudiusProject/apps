import { CommonState } from '~/store/commonStore'

export const getBaseState = (state: CommonState) => state.pages.track

export const getTrackId = (state: CommonState) => getBaseState(state).trackId

export const getTrackPermalink = (state: CommonState) =>
  getBaseState(state).trackPermalink

// Legacy-compatible source tag for the track-page playback queue.
export const getSourceSelector = (state: CommonState) =>
  `TRACK_TRACKS:${getTrackId(state)}`
