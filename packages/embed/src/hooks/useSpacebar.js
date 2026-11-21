import { useEffect } from 'react'

export const useSpacebar = (onSpaceBar, enabled) => {
  useEffect(() => {
    const onKeydown = () => {
      if (enabled && event.keyCode === 32) {
        onSpaceBar()
      }
    }

    window.document.addEventListener('keydown', onKeydown)
    return () => {
      window.document.removeEventListener('keydown', onKeydown)
    }
  }, [onSpaceBar, enabled])
}
