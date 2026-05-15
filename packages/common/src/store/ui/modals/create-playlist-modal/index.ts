import { createModal } from '../createModal'

export type CreatePlaylistModalState = {
  isAlbum?: boolean
  initTrackId?: number
}

const createPlaylistModal = createModal<CreatePlaylistModalState>({
  reducerPath: 'CreatePlaylistModal',
  initialState: {
    isOpen: false,
    isAlbum: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useCreatePlaylistModal,
  reducer: createPlaylistModalReducer,
  actions: createPlaylistModalActions
} = createPlaylistModal
