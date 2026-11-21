import { useCallback, useEffect, useState } from 'react'

export const setOverflowHidden = () => {
  document.body.setAttribute('style', 'overflow:hidden;')
}

export const removeOverflowHidden = () => {
  document.body.setAttribute('style', '')
}

export const setModalRootTop = () => {
  const root = document.getElementById('modalRootContainer')
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
  if (root) {
    root.setAttribute('style', `top: ${scrollY}px`)
  }
}

let modalCount = 0

export const useModalScrollCount = () => {
  const [toggle, setToggle] = useState(false)
  const [isOverflowHidden, setIsOverflowHidden] = useState(false)

  useEffect(() => {
    if (!isOverflowHidden && modalCount > 0) {
      setIsOverflowHidden(true)
      setOverflowHidden()
      setModalRootTop()
    } else if (isOverflowHidden && modalCount === 0) {
      setIsOverflowHidden(false)
      removeOverflowHidden()
    }
    return () => {
      /**
       * On cleanup of the `useScrollLock` hook, if the modal is open,
       * the count is decremented. Because the cleanup of this method
       * depends on the cleanup of `useScrollLock`, setImmediate is
       * used to push this check to the end of the event loop.
       * This guarantees that the getCount call will return
       * an updated number. Else, getCount() may non-deterministically
       * return 0 or 1 on cleanup of a final modal.
       * NOTE: This should only be triggered on un-mount when not closed
       */
      setImmediate(() => {
        if (isOverflowHidden && modalCount === 0) {
          removeOverflowHidden()
        }
      })
    }
  }, [isOverflowHidden, toggle])

  const incrementScrollCount = useCallback(() => {
    modalCount = modalCount + 1
    setToggle((toggle) => !toggle)
  }, [setToggle])
  const decrementScrollCount = useCallback(() => {
    modalCount = Math.max(0, modalCount - 1)
    setToggle((toggle) => !toggle)
  }, [setToggle])

  return {
    incrementScrollCount,
    decrementScrollCount
  }
}
