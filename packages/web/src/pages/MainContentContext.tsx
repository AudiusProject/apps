import {
  createContext,
  memo,
  useRef,
  useContext,
  useState,
  MutableRefObject,
  ReactNode
} from 'react'

export const MAIN_CONTENT_ID = 'mainContent'

export const MainContentContext = createContext({
  setRef: (() => {}) as (node: HTMLDivElement) => void,
  ref: {} as MutableRefObject<HTMLDivElement | undefined>,
  ready: false
})

export const useMainContentRef = () => {
  const { ref } = useContext(MainContentContext)
  return ref
}

export const MainContentContextProvider = memo(
  (props: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement | undefined>(undefined)
    const [ready, setReady] = useState(false)
    return (
      <MainContentContext.Provider
        value={{
          setRef: (node: HTMLDivElement) => {
            if (node && !ref.current) {
              setReady(true)
            }
            ref.current = node
          },
          ref,
          ready
        }}
      >
        {props.children}
      </MainContentContext.Provider>
    )
  }
)
