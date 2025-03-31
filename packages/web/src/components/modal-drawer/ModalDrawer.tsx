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
 * Either a modal or a drawer.
 * Not fully generic (has some built in styles) - can
 * pull this out later if it's more broadly useful.
 */
const ModalDrawer = (props: ModalDrawerProps) => {
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
