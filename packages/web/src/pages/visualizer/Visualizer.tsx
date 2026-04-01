import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
  lazy
} from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { AppState } from 'store/types'
import { getIsVisible } from './store/selectors'
import { closeVisualizer, toggleVisibility } from './store/slice'

import styles from './Visualizer.module.css'
import { useLocation } from 'react-router'
import { useHotkeys } from '@audius/harmony'
import ButterchurnVisualizer from 'utils/visualizer/butterchurnVisualizer'

import { NO_VISUALIZER_ROUTES } from './constants'

export { NO_VISUALIZER_ROUTES }

const VisualizerProvider = lazy(() => import('./VisualizerProvider'))

type VisualizerProps = {} & ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const Visualizer = ({
  isVisible,
  toggleVisibility,
  closeVisualizer
}: VisualizerProps) => {
  const location = useLocation()
  const { pathname } = location
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsLoaded(true)
    }
  }, [isVisible])

  const onToggleVisibility = useCallback(() => {
    if (NO_VISUALIZER_ROUTES.has(pathname)) return

    toggleVisibility()
  }, [toggleVisibility, pathname])

  const onCloseVisualizer = useCallback(() => {
    if (!isVisible) return
    closeVisualizer()
  }, [closeVisualizer, isVisible])

  const onHistoryForward = useCallback(() => {
    if (isVisible) ButterchurnVisualizer?.historyForwardOrNext()
  }, [isVisible])

  const onHistoryBack = useCallback(() => {
    if (isVisible) ButterchurnVisualizer?.historyBack()
  }, [isVisible])

  const onRandomPreset = useCallback(() => {
    if (isVisible) ButterchurnVisualizer?.randomPreset()
  }, [isVisible])

  const hotkeyMap = useMemo(
    () => ({
      27 /* ESC */: onCloseVisualizer,
      86 /* v */: onToggleVisibility,
      // Space (32) intentionally omitted — conflicts with global play/pause hotkey
      190 /* . */: onHistoryForward,
      188 /* , */: onHistoryBack,
      82 /* r */: onRandomPreset
    }),
    [
      onCloseVisualizer,
      onToggleVisibility,
      onHistoryForward,
      onHistoryBack,
      onRandomPreset
    ]
  )

  useHotkeys(hotkeyMap)

  return isLoaded ? (
    <Suspense fallback={<div className={styles.fallback} />}>
      <VisualizerProvider isVisible={isVisible} onClose={onCloseVisualizer} />
    </Suspense>
  ) : null
}

function mapStateToProps(state: AppState) {
  return {
    isVisible: getIsVisible(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    toggleVisibility: () => dispatch(toggleVisibility()),
    closeVisualizer: () => dispatch(closeVisualizer())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Visualizer)
