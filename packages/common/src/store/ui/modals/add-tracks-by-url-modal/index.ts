import { ID } from '../../../../models'
import { createModal } from '../createModal'

export type AddTracksByUrlModalState = {
  collectionId?: ID
  isAlbum?: boolean
}

const addTracksByUrlModal = createModal<AddTracksByUrlModalState>({
  reducerPath: 'AddTracksByUrlModal',
  initialState: {
    isOpen: false,
    isAlbum: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useAddTracksByUrlModal,
  reducer: addTracksByUrlModalReducer,
  actions: addTracksByUrlModalActions
} = addTracksByUrlModal
