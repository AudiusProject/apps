import { createModal } from '../createModal'

export type AddCashModalState = {
  isOpen: boolean
  portalHostName?: string
}

const AddCashModal = createModal<AddCashModalState>({
  reducerPath: 'AddCashModal',
  initialState: {
    isOpen: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const { hook: useAddCashModal, reducer: addCashModalReducer } =
  AddCashModal
