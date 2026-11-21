import {
  Flex,
  Modal,
  ModalContent,
  ModalHeader,
  ModalProps,
  ModalTitle,
  Text
} from '@audius/harmony'
import cn from 'classnames'

import Drawer, { DrawerProps } from 'components/drawer/Drawer'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './ModalDrawer.module.css'

type ModalDrawerProps = ModalProps &
  DrawerProps &
  (
    | { newModal?: false }
    | {
        newModal?: boolean
        title?: string
        icon?: React.ReactNode
      }
  )

/**
 * @deprecated Use ResponsiveModal from 'components/modal/ResponsiveModal' instead.
 * This component will be removed in a future version.
 *
 * ModalDrawer was a transitional component that conditionally renders either a Modal or Drawer
 * based on screen size. It has been superseded by ResponsiveModal which provides a more
 * consistent API and better mobile/desktop experience.
 *
 * @example
 * ```tsx
 * // Old usage with ModalDrawer
 * <ModalDrawer isOpen={isOpen} onClose={handleClose}>
 *   <p>Content</p>
 * </ModalDrawer>
 *
 * // New usage with ResponsiveModal
 * <ResponsiveModal isOpen={isOpen} onClose={handleClose}>
 *   <p>Content</p>
 * </ResponsiveModal>
 * ```
 */
const ModalDrawer = (props: ModalDrawerProps) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'ModalDrawer is deprecated. Please use ResponsiveModal from components/modal/ResponsiveModal instead.'
    )
  }

  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer
        isOpen={props.isOpen}
        onClose={props.onClose}
        onClosed={props.onClosed}
        isFullscreen={
          props.isFullscreen === undefined ? true : props.isFullscreen
        }
        zIndex={props.zIndex}
        shouldClose={props.shouldClose}
      >
        <Flex column h='100%' gap='l'>
          <Flex pt='l' pb='s' justifyContent='center'>
            <Text variant='label' size='l' strength='strong' color='subdued'>
              {props.title}
            </Text>
          </Flex>
          <Flex pv='2xl' ph='l' h='100%'>
            {props.children}
          </Flex>
        </Flex>
      </Drawer>
    )
  }

  if (!props.newModal) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Using ModalDrawer with newModal=false is deprecated. Please use ResponsiveModal with the new modal style.'
      )
    }
    return (
      <Modal
        {...props}
        bodyClassName={cn(styles.modalBody, {
          [props.bodyClassName!]: !!props.bodyClassName
        })}
      />
    )
  }

  const { title, icon, children, isOpen, onClose, onClosed, size } = props

  return (
    <Modal isOpen={isOpen} onClose={onClose} onClosed={onClosed} size={size}>
      <ModalHeader>
        <ModalTitle title={title} icon={icon} />
      </ModalHeader>
      <ModalContent>{children}</ModalContent>
    </Modal>
  )
}

export default ModalDrawer
