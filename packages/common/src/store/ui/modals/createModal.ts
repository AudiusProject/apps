import { useCallback } from 'react'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import { ModalSource } from '~/models/Analytics'
import { CommonState } from '~/store'

import { actions } from './parentSlice'
import { BaseModalState } from './types'

type BaseCreateModalConfig<T> = {
  reducerPath: string
  initialState: T & BaseModalState
  sliceSelector?: (state: CommonState) => Record<string, any>
}

type ModalTrackingConfig<T> =
  | { enableTracking?: false; getTrackingData?: never }
  | {
      enableTracking: true
      getTrackingData: (state: T) => Record<string, any>
    }

type CreateModalConfig<T> = BaseCreateModalConfig<T> & ModalTrackingConfig<T>

export const createModal = <T>({
  reducerPath,
  initialState,
  sliceSelector,
  enableTracking = false,
  getTrackingData
}: CreateModalConfig<T>) => {
  const slice = createSlice({
    name: `modals/${reducerPath}`,
    initialState,
    reducers: {
      open: (_, action: PayloadAction<T>) => {
        return { ...action.payload, isOpen: true }
      },
      set: (state, action: PayloadAction<T>) => {
        return { ...state, ...action.payload }
      },
      close: (state) => {
        state.isOpen = 'closing'
      },
      closed: () => {
        return { ...initialState, isOpen: false }
      }
    }
  })

  const selector = (state: CommonState) => {
    let baseState: (T & BaseModalState) | undefined
    if (sliceSelector) {
      baseState = sliceSelector(state)[reducerPath]
    } else {
      baseState = state[reducerPath]
    }
    if (!baseState) {
      throw new Error(
        `State for ${reducerPath} is undefined - did you forget to register the reducer in src/store/ui/modals/reducers.ts?`
      )
    }
    return baseState
  }

  const open = slice.actions.open as (
    state: T & BaseModalState
  ) => PayloadAction<T & BaseModalState>

  const { close, closed, set } = slice.actions
  const useModal = () => {
    const { isOpen, ...data } = useSelector(selector)
    const dispatch = useDispatch()

    const onOpen = useCallback(
      (
        state?: T,
        { source }: { source: ModalSource } = { source: ModalSource.Unknown }
      ) => {
        if (!state) {
          dispatch(open({ ...initialState, isOpen: true }))
        } else {
          dispatch(open({ ...state, isOpen: true }))
        }
        if (enableTracking) {
          const trackingData =
            state && getTrackingData ? getTrackingData(state) : undefined
          dispatch(
            actions.trackModalOpened({
              name: reducerPath,
              trackingData,
              source
            })
          )
        }
      },
      [dispatch]
    )
    const onClose = useCallback(() => {
      dispatch(close())
    }, [dispatch])

    const onClosed = useCallback(() => {
      dispatch(closed())
      if (enableTracking) {
        dispatch(actions.trackModalClosed({ name: reducerPath }))
      }
    }, [dispatch])

    const setData = useCallback(
      (state?: Partial<T>) => {
        dispatch(set({ ...state }))
      },
      [dispatch]
    )

    return {
      isOpen: isOpen === true,
      data,
      setData,
      onOpen,
      onClose,
      onClosed
    }
  }

  return {
    hook: useModal,
    actions: slice.actions,
    reducer: slice.reducer
  }
}
