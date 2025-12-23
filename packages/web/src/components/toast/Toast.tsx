import {
  useCallback,
  useEffect,
  useState,
  useRef,
  MutableRefObject
} from 'react'

import { useHasAccount } from '@audius/common/api'
import { Box, Popup, type PopupProps } from '@audius/harmony'

type ToastProps = {
  text: string | JSX.Element
  children?: JSX.Element
  open?: boolean
  delay?: number
  requireAccount?: boolean
  onVisibilityChange?: (isVisible: boolean) => void
  disabled?: boolean
  firesOnClick?: boolean
  containerClassName?: string
  containerStyles?: object
} & Pick<
  PopupProps,
  'anchorOrigin' | 'transformOrigin' | 'portalLocation' | 'className'
>

const Toast = ({
  text,
  children,
  open,
  delay = 3000,
  requireAccount = true,
  onVisibilityChange,
  disabled = false,
  firesOnClick = true,
  containerClassName,
  containerStyles,
  anchorOrigin,
  transformOrigin,
  portalLocation,
  className,
  ...popupProps
}: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const divRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = divRef as MutableRefObject<HTMLElement | null>
  const hasAccount = useHasAccount()

  const handleClose = useCallback(() => {
    setIsVisible(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    onVisibilityChange?.(false)
  }, [onVisibilityChange])

  const handleClick = useCallback(() => {
    if (disabled || !firesOnClick || (!hasAccount && requireAccount)) return

    setIsVisible(true)
    onVisibilityChange?.(true)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(handleClose, delay)
  }, [
    disabled,
    firesOnClick,
    hasAccount,
    requireAccount,
    delay,
    handleClose,
    onVisibilityChange
  ])

  useEffect(() => {
    if (open !== undefined) {
      setIsVisible(open)
      if (open && delay) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(handleClose, delay)
      }
    }
  }, [open, delay, handleClose])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const visible = open !== undefined ? open : isVisible

  return (
    <>
      <div
        ref={divRef}
        onClick={handleClick}
        className={containerClassName}
        style={containerStyles}
      >
        {children}
      </div>
      {visible && (
        <Popup
          {...popupProps}
          anchorRef={anchorRef}
          isVisible={visible}
          onClose={handleClose}
          hideCloseButton
          zIndex={10000}
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          portalLocation={portalLocation}
          dismissOnMouseLeave={false}
          shadow='mid'
          className={className}
        >
          <Box
            pt='xs'
            pb='xs'
            pl='s'
            pr='s'
            borderRadius='m'
            style={{
              backgroundColor: 'var(--harmony-secondary)',
              color: 'var(--harmony-white)',
              fontSize: '12px',
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            {text}
          </Box>
        </Popup>
      )}
    </>
  )
}

export default Toast
