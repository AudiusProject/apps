import type { IconComponent } from '../icon'

export type Option<T> = {
  key: T
  text: string
  icon?: React.ReactNode
  leftIcon?: IconComponent
  disabled?: boolean
  variant?: 'default' | 'subdued'
}

export type SegmentedControlProps<T extends string> = {
  options: Array<Option<T>>

  selected: string

  onSelectOption: (key: T) => void

  /**
   * Causes the control to take up the full width of the parent. Incompatible
   * with `equalWidth`  */
  fullWidth?: boolean

  /**
   * Causes all tabs to be rendered at an equal width based on the largest natural
   * content width. Incompatible with `fullWidth`
   */
  equalWidth?: boolean

  disabled?: boolean

  isMobile?: boolean

  /**
   * Escape hatch for styles.
   */
  className?: string

  /**
   * Styles specificlaly applied to slider text
   */
  textClassName?: string

  /**
   * Styles applied only to active cell text
   */
  activeTextClassName?: string

  /**
   * The label for the radio group
   */
  label?: string
  'aria-labelledby'?: string

  /**
   * A hack to allow shifting animations to settle before recalculating the tab width
   */
  forceRefreshAfterMs?: number
}
