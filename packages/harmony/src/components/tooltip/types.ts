import type { ReactNode } from 'react'

export type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom'

export type TooltipMount = 'parent' | 'page' | 'body'

export type TooltipProps = {
  children: ReactNode
  className?: string
  /**
   * Determines if the tooltip should display
   */
  disabled?: boolean
  /**
   * Where the tooltip gets mounted
   */
  mount?: TooltipMount
  /**
   * Whether the tooltip should have a custom container/mount.
   * Takes precedence over `mount`
   */
  getPopupContainer?: () => ParentNode | null
  /**
   * Delay in seconds before showing tooltip on mouse enter
   */
  mouseEnterDelay?: number
  /**
   * Delay in seconds before hiding tooltip on mouse leave
   */
  mouseLeaveDelay?: number
  /**
   * Placement of the tooltip relative to the trigger element
   */
  placement?: TooltipPlacement
  /**
   * Should the tooltip go away when clicking on the underlying element?
   */
  shouldDismissOnClick?: boolean
  /**
   * Whether there is a fixed max width, causing content to wrap onto the next line
   */
  shouldWrapContent?: boolean
  /**
   * Text to appear in tooltip
   */
  text?: ReactNode
  /**
   * Color variant of the tooltip
   */
  color?: 'primary' | 'secondary' | 'white'
  /**
   * Optional z-index for the tooltip
   */
  zIndex?: number
}
