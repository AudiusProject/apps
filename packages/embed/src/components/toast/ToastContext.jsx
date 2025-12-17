import { createContext, useCallback, useState, useRef } from 'react'

import { CSSTransition } from 'react-transition-group'

import Toast from './Toast'
import styles from './ToastContext.module.css'
import transitions from './ToastTransitions.module.css'

const DEFAULT_TIMEOUT = 3000

export const ToastContext = createContext({
  toast: () => {}
})

export const ToastContextProvider = (props) => {
  const [toastState, setToastState] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const toastRef = useRef(null)

  const toast = useCallback(
    (text, timeout = DEFAULT_TIMEOUT) => {
      if (isVisible) return
      setToastState({ text })
      setIsVisible(true)
      setTimeout(() => {
        setIsVisible(false)
      }, timeout)
    },
    [setToastState, isVisible, setIsVisible]
  )

  return (
    <ToastContext.Provider
      value={{
        toast
      }}
    >
      <div className={styles.container}>
        <CSSTransition
          nodeRef={toastRef}
          classNames={transitions}
          in={isVisible}
          timeout={1000}
        >
          <div ref={toastRef}>
            <Toast text={toastState ? toastState.text : ''} />
          </div>
        </CSSTransition>
      </div>
      {props.children}
    </ToastContext.Provider>
  )
}
