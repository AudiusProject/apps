import { createModal } from '../createModal'

export type ReplaceTrackProgressModalState = {
  loaded?: number
  total?: number
  transcode?: number

  error: boolean
}

const replaceTrackProgressModal = createModal<ReplaceTrackProgressModalState>({
  reducerPath: 'ReplaceTrackProgress',
  initialState: {
    isOpen: false,
    loaded: 0,
    total: 0,
    transcode: 0,
    error: false
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useReplaceTrackProgressModal,
  reducer: replaceTrackProgressModalReducer,
  actions: replaceTrackProgressModalActions
} = replaceTrackProgressModal
