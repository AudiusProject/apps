import { createModal } from '../createModal'

export type DuplicatePlaylistModalState = {
  isAlbum?: boolean
}

const duplicatePlaylistModal = createModal<DuplicatePlaylistModalState>({
  reducerPath: 'DuplicatePlaylistModal',
  initialState: {
    isOpen: false,
    isAlbum: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useDuplicatePlaylistModal,
  reducer: duplicatePlaylistModalReducer,
  actions: duplicatePlaylistModalActions
} = duplicatePlaylistModal
