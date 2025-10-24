import { HTMLAttributes, ReactNode } from 'react'

import { IconComponent } from '../icon'
import { FlexProps } from '../layout/Flex'
import { ScrollbarProps } from '../scrollbar'

export enum Anchor {
  CENTER = 'CENTER',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM'
}

export type ModalProps = {
  /**
   * Optional unique key to assign to the modal.
   * If not provided, it is auto-generated.
   */
  modalKey?: string

  /**
   * Modal contents
   */
  children: ReactNode

  /**
   * Callback fired when the modal is closed
   * Should set isOpen accordingly
   */
  onClose: () => void

  /**
   * Callback fired when the modal children are removed from the dom.
   */
  onClosed?: () => void

  /**
   * Whether or not the modal is open
   */
  isOpen: boolean

  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  showTitleHeader?: boolean
  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  title?: ReactNode
  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  subtitle?: string

  /**
   * Whether to dismiss on a click outside the modal
   */
  dismissOnClickOutside?: boolean

  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  showDismissButton?: boolean

  /**
   * Manually set z-index.
   *
   * By default, the z-index is 10000 and the modal background shadow is
   * set to z-index - 1 so that the modal appears on top of the shadow.
   *
   * If you would like to nest modals, it's important to increase the z-index by
   * 2 for every modal so that the parent modal lives behind the child modal's shadow.
   */
  zIndex?: number

  /** @deprecated */
  allowScroll?: boolean

  // Classnames

  wrapperClassName?: string

  /**
   *  Set max-width on bodyClass to set the modal width
   */
  bodyClassName?: string

  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  titleClassName?: string
  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  subtitleClassName?: string
  /**
   * @deprecated in favor of composability - use ModalHeader sub-component instead.
   */
  headerContainerClassName?: string

  anchor?: Anchor
  verticalAnchorOffset?: number

  /**
   * Horizontal padding between modal edges and viewport edge
   */
  horizontalPadding?: number

  /**
   * @deprecated in favor of composability - use ModalContent sub-component instead
   */
  contentHorizontalPadding?: number

  /**
   * Optional aria description for the dialog.
   * If not provided, it is auto-generated.
   */
  'aria-describedby'?: string

  /**
   * Optional aria label for the dialog.
   * If not provided, it is auto-generated.
   */
  'aria-labelledby'?: string
  /**
   * If provided, conform to standard modal widths
   * (only small currently implemented)
   */
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export type ModalContentProps = ScrollbarProps

export type ModalHeaderProps = HTMLAttributes<HTMLDivElement> & {
  dismissButtonClassName?: string
  showDismissButton?: boolean
  onClose?: () => void
  children: ReactNode
}

export type ModalTitleProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  subtitleClassName?: string
  /**
   * @deprecated use Icon prop instead
   */
  icon?: ReactNode
  Icon?: IconComponent
  iconClassName?: string
  title: ReactNode
  titleClassName?: string
  subtitle?: ReactNode
  titleId?: string
  subtitleId?: string
}

export type ModalFooterProps = FlexProps
