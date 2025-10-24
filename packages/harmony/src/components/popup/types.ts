import type { MutableRefObject, ReactElement } from 'react'

import { ShadowOptions } from '~harmony/foundations'

export type Origin = {
  vertical: 'top' | 'center' | 'bottom'
  horizontal: 'left' | 'center' | 'right'
}

export type PopupProps = {
  className?: string
  /**
   * A ref to the element whose position will be used to anchor the Popup
   */
  anchorRef: MutableRefObject<HTMLElement | null>

  /**
   * Boolean representing whether the Popup is visible
   */
  isVisible: boolean

  /**
   * The position of the popup in relation to the anchorRef.
   * For example, if set to { horizontal: 'center', vertical: 'bottom' },
   * the popup will appear centered and below the anchoRef.
   */
  anchorOrigin?: Origin

  /**
   * The origin of the animation of the Popup.
   * For example, if set to { horizontal: center', vertical: 'top' },
   * the popup will animate top down moving out from the center.
   */
  transformOrigin?: Origin

  /**
   * Children to render inside the Popup
   */
  children?: ReactElement

  /**
   * Whether to dismiss the popup on mouse leave
   */
  dismissOnMouseLeave?: boolean

  /**
   * Show the header
   */
  showHeader?: boolean

  /**
   * A title displayed at the top of the Popup (only visible when the header is enabled)
   */
  title?: string

  /**
   * Hide the close button when displaying the header
   */
  hideCloseButton?: boolean

  /**
   * An optional z-index to override the default of 10000
   */
  zIndex?: number

  /**
   * An optional container ref that controls what the popup considers
   * to be the size of the container it belongs to. If the popup expands outside
   * the bounds of the container, it repositions itself.
   */
  containerRef?: MutableRefObject<HTMLDivElement | undefined>

  /**
   * Fired when a close event is dispatched, but the animation is not necessarily finished
   */
  onClose?: () => void

  /**
   * Fired after the popup finishes closing
   */
  onAfterClose?: () => void

  /**
   * A function used to check if a click falls inside any element
   * that should not close the popup. Clicks inside the menu itself
   * are automatically considered inside
   */
  checkIfClickInside?: (target: EventTarget) => boolean

  /**
   * Portal location
   * @default document.body
   */
  portalLocation?: HTMLElement
  shadow?: ShadowOptions
  fixed?: boolean

  /**
   * When true, the popup will respect the provided origins and avoid flipping
   * or clamping itself to remain within the viewport.
   */
  disableAutoFlip?: boolean

  /**
   * Whether to take the width of the anchor element
   */
  takeWidthOfAnchor?: boolean
}
