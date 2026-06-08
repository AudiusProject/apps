import { ReactNode } from 'react'

import {
  Flex,
  IconComponent,
  Modal,
  ModalHeader,
  ModalTitle,
  Text
} from '@audius/harmony'

import Drawer from 'components/drawer/Drawer'
import { useIsMobile } from 'hooks/useIsMobile'

export type ResponsiveModalProps = {
  className?: string
  // Core props
  isOpen: boolean
  onClose: () => void
  onClosed?: () => void
  children: ReactNode

  // Content props
  title?: string
  Icon?: IconComponent
  subtitle?: string

  // Layout props
  size?: 's' | 'm' | 'l' | 'xl'
  isFullscreen?: boolean // Only applies to mobile drawer

  // Behavior props
  showDismissButton?: boolean
  dismissOnClickOutside?: boolean
  zIndex?: number

  // Optional overrides
  renderAsDrawer?: boolean // Force drawer on desktop
  renderAsModal?: boolean // Force modal on mobile
}

/**
 * A responsive modal component that automatically renders as a drawer on mobile
 * and a modal on desktop. It provides a unified API for both experiences.
 *
 * @example
 * ```tsx
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="My Modal"
 *   icon={<IconInfo />}
 * >
 *   <p>Modal content here</p>
 * </ResponsiveModal>
 * ```
 */
const ResponsiveModal = ({
  isOpen,
  onClose,
  onClosed,
  children,
  title,
  Icon,
  subtitle,
  size = 'm',
  isFullscreen,
  dismissOnClickOutside = true,
  showDismissButton,
  zIndex,
  renderAsDrawer,
  renderAsModal,
  className
}: ResponsiveModalProps) => {
  const isMobile = useIsMobile()
  const shouldRenderAsDrawer = renderAsDrawer ?? (isMobile && !renderAsModal)

  // Map size prop to Modal component's expected values
  const getModalSize = (size: string) => {
    switch (size) {
      case 's':
        return 'small'
      case 'm':
        return 'medium'
      case 'l':
        return 'large'
      case 'xl':
        return 'large'
      default:
        return 'medium'
    }
  }

  if (shouldRenderAsDrawer) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        onClosed={onClosed}
        isFullscreen={isFullscreen}
        zIndex={zIndex}
      >
        <Flex column h='100%' gap='l'>
          {(title || Icon) && (
            <Flex pt='l' pb='s' justifyContent='center'>
              <ModalTitle title={title} Icon={Icon} />
            </Flex>
          )}
          {subtitle && (
            <Text variant='body' size='s' color='subdued'>
              {subtitle}
            </Text>
          )}
          {children}
        </Flex>
      </Drawer>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      size={getModalSize(size)}
      zIndex={zIndex}
      dismissOnClickOutside={dismissOnClickOutside}
      className={className}
    >
      {(title || Icon || subtitle) && (
        <ModalHeader showDismissButton={showDismissButton}>
          <ModalTitle title={title} Icon={Icon} />
          {subtitle && (
            <Text variant='body' size='s' color='subdued'>
              {subtitle}
            </Text>
          )}
        </ModalHeader>
      )}
      {children}
    </Modal>
  )
}

export default ResponsiveModal
