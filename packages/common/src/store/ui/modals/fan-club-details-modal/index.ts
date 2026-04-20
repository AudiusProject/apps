import { createModal } from '../createModal'
import { FanClubDetailsModalState } from '../types'

const fanClubDetailsModal = createModal<FanClubDetailsModalState>({
  reducerPath: 'FanClubDetailsModal',
  initialState: {
    isOpen: false,
    mint: undefined
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useFanClubDetailsModal,
  actions: fanClubDetailsModalActions,
  reducer: fanClubDetailsModalReducer
} = fanClubDetailsModal
