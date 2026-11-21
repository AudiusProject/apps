import { useCallback, useMemo } from 'react'

import { modalsSelectors, modalsActions, Modals } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { useSelector } from './useSelector'

const { setVisibility } = modalsActions
const { getModalVisibility } = modalsSelectors
export const useSetVisibility = () => {
  const dispatch = useDispatch()
  const setVisibilityFunc = useCallback(
    (modalName: Modals) => (isOpen: boolean) => {
      dispatch(setVisibility({ modal: modalName, visible: isOpen }))
    },
    [dispatch]
  )
  return setVisibilityFunc
}

const useGetVisibility = (modalName: Modals) => {
  return useSelector((state) => getModalVisibility(state, modalName))
}

export const useModalState = (
  modalName: Modals
): [boolean, (isOpen: boolean) => void] => {
  const isOpen = useGetVisibility(modalName)
  const setVisibility = useSetVisibility()
  const setter = useMemo(
    () => setVisibility(modalName),
    [modalName, setVisibility]
  )
  return [isOpen === true, setter]
}
