import { createAction } from '@reduxjs/toolkit'

import { createModal } from '../createModal'

export type PublishHiddenTracksConfirmationModalState = {
  contentType: 'album' | 'playlist'
  hiddenTrackCount: number
}

const publishHiddenTracksConfirmationModal =
  createModal<PublishHiddenTracksConfirmationModalState>({
    reducerPath: 'PublishHiddenTracksConfirmation',
    initialState: {
      isOpen: false,
      contentType: 'playlist',
      hiddenTrackCount: 0
    },
    sliceSelector: (state) => state.ui.modals
  })

export const {
  hook: usePublishHiddenTracksConfirmationModal,
  reducer: publishHiddenTracksConfirmationModalReducer,
  actions: publishHiddenTracksConfirmationModalActions
} = publishHiddenTracksConfirmationModal

/**
 * The publish sagas block on one of these after opening the modal. They carry no
 * payload: the saga already knows which collection it is publishing.
 */
export const publishHiddenTracksConfirmed = createAction(
  'modals/PublishHiddenTracksConfirmation/confirmed'
)
export const keepHiddenTracksPrivate = createAction(
  'modals/PublishHiddenTracksConfirmation/keepPrivate'
)
