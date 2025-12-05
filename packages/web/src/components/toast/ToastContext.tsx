import { createContext, ReactNode, useCallback } from 'react'

import { toastActions, CommonState } from '@audius/common/store'
import { IconComponent } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useTransition, animated } from 'react-spring'

import { getSafeArea, SafeAreaDirection } from 'utils/safeArea'
import zIndex from 'utils/zIndex'

import styles from './ToastContext.module.css'
import Toast from './mobile/Toast'
const animatedAny = animated as any
const { clearToasts, toast, dismissToast } = toastActions

const DEFAULT_TIMEOUT = 3000

const animationConfig = {
  tension: 125,
  friction: 20,
  precision: 0.1
}

const FROM_POSITION = -20
const ENTER_POSITION = 20
const TOAST_SPACING = 40

// Interpolates the index of a toast in the list of visible
// toasts to a valid Y index into [FROM_POSITION, index * toast spacing + ENTER_POSITION]
const interp = (i: number) => (y: number) =>
  y === FROM_POSITION
    ? `translate3d(-50%,${y}px,0)`
    : `translate3d(-50%, ${y + i * TOAST_SPACING}px, 0)`

type ToastContextProps = {
  toast: (
    content: string | JSX.Element,
    timeout?: number,
    icons?: { leftIcon?: IconComponent; rightIcon?: IconComponent } | {}
  ) => void
  clear: () => void
}

type ToastType = {
  content: string | JSX.Element
  key: string
  link?: string
  linkText?: string
  leftIcon?: IconComponent
  rightIcon?: IconComponent
}

export const ToastContext = createContext<ToastContextProps>({
  clear: () => {},
  toast: () => {}
})

export const ToastContextProvider = (props: { children: ReactNode }) => {
  const toasts = useSelector((state: CommonState) => state.ui.toast.toasts)
  const dispatch = useDispatch()

  const handleToast = useCallback(
    (
      content: string | JSX.Element,
      timeout: number = DEFAULT_TIMEOUT,
      icons: { leftIcon?: IconComponent; rightIcon?: IconComponent } = {}
    ) => {
      dispatch(
        toast({
          content,
          timeout,
          leftIcon: icons.leftIcon,
          rightIcon: icons.rightIcon
        })
      )
    },
    [dispatch]
  )

  const clear = useCallback(() => {
    dispatch(clearToasts())
  }, [dispatch])

  const handleDismiss = useCallback(
    (key: string) => {
      dispatch(dismissToast({ key }))
    },
    [dispatch]
  )

  const transitions = useTransition(toasts, (toast) => toast.key, {
    from: (toast: ToastType) => ({ y: FROM_POSITION, opacity: 0 }),
    enter: (toast: ToastType) => ({
      y: ENTER_POSITION + getSafeArea(SafeAreaDirection.TOP),
      opacity: 1
    }),
    leave: (toast: ToastType) => ({ y: FROM_POSITION, opacity: 0 }),
    unique: true,
    config: animationConfig
  })

  return (
    <ToastContext.Provider
      value={{
        clear,
        toast: handleToast
      }}
    >
      {transitions.map(({ item, props, key }, i) => (
        <animatedAny.div
          key={key}
          className={styles.container}
          style={{
            // @ts-ignore
            transform: props.y.interpolate(interp(i)),
            opacity: props.opacity,
            zIndex: zIndex.TOAST
          }}
        >
          <Toast
            content={item.content}
            link={item.link}
            linkText={item.linkText}
            leftIcon={
              item.leftIcon && (
                <item.leftIcon
                  size='s'
                  color='staticWhite'
                  css={{ cursor: 'pointer' }}
                  onClick={() => handleDismiss(item.key)}
                />
              )
            }
            rightIcon={
              item.rightIcon && (
                <item.rightIcon
                  size='s'
                  color='staticWhite'
                  css={{ cursor: 'pointer' }}
                  onClick={() => handleDismiss(item.key)}
                />
              )
            }
            isControlled
            isOpen
          />
        </animatedAny.div>
      ))}
      {props.children}
    </ToastContext.Provider>
  )
}
