import { ReactNode } from 'react'

import { TriggerType } from '../../hooks/useHoverDelay'
import { IconComponent } from '../icon'
import { Origin } from '../popup/types'

export type HoverCardProps = {
  /**
   * Content displayed as the hover trigger
   */
  children: ReactNode

  /**
   * Content displayed inside the hover card
   */
  content: ReactNode

  /**
   * Optional CSS class name
   */
  className?: string

  /**
   * Callback fired when the hover card is closed
   */
  onClose?: () => void

  /**
   * Callback fired when the hover card is clicked
   */
  onClick?: () => void

  /**
   * Position of the anchor origin
   * @default { horizontal: 'right', vertical: 'center' }
   */
  anchorOrigin?: Origin

  /**
   * Position of the transform origin
   * @default { horizontal: 'left', vertical: 'center' }
   */
  transformOrigin?: Origin

  /**
   * Delay in seconds before the hover card appears after mouse enter
   * @default 0.5
   */
  mouseEnterDelay?: number

  /**
   * Whether to trigger the hover card on hover, click, or both
   * @default 'hover'
   */
  triggeredBy?: TriggerType

  /**
   * Callback fired when hover state changes
   * @param isHovered Whether the component is currently being hovered
   */
  onHover?: (isHovered: boolean) => void
}

export type HoverCardHeaderProps = {
  /**
   * Optional icon to display on the left side of the header
   */
  iconLeft?: IconComponent
  /**
   * Optional icon to display on the right side of the header
   */
  iconRight?: IconComponent
  /**
   * The title to display in the header
   */
  title: string
  /**
   * Optional callback for when either icon in the header is clicked.
   */
  onClick?: () => void
  /**
   * Optional callback when the close button is clicked.
   * If not provided, the close button will be rendered as a non-interactive icon.
   */
  onClose?: () => void
}
