import { createSlice } from '@reduxjs/toolkit'

import {
  AddToastAction,
  DissmissToastAction,
  ManualClearToastAction,
  ToastAction,
  ToastState
} from './types'

const initialState: ToastState = {
  toasts: []
}

const slice = createSlice({
  name: 'application/ui/toast',
  initialState,
  reducers: {
    toast: (_, _action: ToastAction) => {
      // Triggers saga
    },
    registerToast: (state, action: AddToastAction) => {
      const toast = action.payload
      state.toasts.push(toast)
    },
    manualClearToast: (state, action: ManualClearToastAction) => {
      const toastIdx = state.toasts.findIndex(
        (t) => t.key === action.payload.key
      )
      if (!state.toasts[toastIdx]) return
      state.toasts[toastIdx].timeout = 0
    },
    dismissToast: (state, action: DissmissToastAction) => {
      const { key } = action.payload
      const toasts = state.toasts.filter((toast) => toast.key !== key)
      state.toasts = toasts
    },
    clearToasts: (state) => {
      state.toasts = []
    }
  }
})

export const {
  toast,
  dismissToast,
  registerToast,
  clearToasts,
  manualClearToast
} = slice.actions

export const actions = slice.actions
export default slice.reducer
