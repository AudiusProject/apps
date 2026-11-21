import { MutableRefObject, useEffect, useRef } from 'react'

/**
 * Custom hook that fires an onClick callback when the user clicks
 * outside of the element referenced by the returned ref.
 *
 * @param onClick the callback fired when a click is performed "outside"
 * @param ignoreClick optional check to be run on the element that receives
 * the "click." If ignoreClick returns true, the click is not considered outside
 * even if it was outside the element referenced.
 * @param defaultRef optional ref to use, if not provided a new ref will be created & returned
  
 * @returns a ref that should be used to mark the "inside" element
 */
export const useClickOutside = (
  onClick: () => void,
  isVisible: boolean,
  ignoreClick?: (target: EventTarget) => boolean,
  defaultRef?: MutableRefObject<any> | null,
  anchorRef?: MutableRefObject<any> | null
) => {
  const ref = useRef(defaultRef?.current ?? null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.target) {
        if (
          ignoreClick
            ? ignoreClick(e.target)
            : !ref.current ||
              (ref.current && ref.current.contains(e.target)) ||
              anchorRef?.current?.contains(e.target)
        ) {
          return
        }
      }

      const handleMouseup = () => {
        onClick()
        document.removeEventListener('mouseup', handleMouseup)
      }

      document.addEventListener('mouseup', handleMouseup)
    }

    if (isVisible) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClick)
      }, 0)
    }
    return () => {
      setTimeout(() => {
        document.removeEventListener('mousedown', handleClick)
      }, 0)
    }
  }, [onClick, ignoreClick, isVisible, anchorRef])

  return ref
}
