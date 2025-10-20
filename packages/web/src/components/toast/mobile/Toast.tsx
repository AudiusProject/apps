import { ReactNode } from 'react'

import { Text, Flex } from '@audius/harmony'
import cn from 'classnames'

import ToastLinkContent from './ToastLinkContent'

interface ToastProps {
  children?: JSX.Element
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  content: ReactNode
  link?: string
  linkText?: string
  disabled?: boolean
  top?: number
  delay?: number
  containerClassName?: string
  stopClickPropagation?: boolean
  // Whether or not this toast is controlled by the parent or not
  isControlled?: boolean
  isOpen?: boolean
}

const Toast = (props: ToastProps) => {
  const {
    children,
    content: contentProp,
    containerClassName,
    leftIcon,
    link,
    linkText,
    rightIcon
  } = props

  const content =
    link && linkText ? (
      <ToastLinkContent
        link={link}
        linkText={linkText}
        text={contentProp as string}
      />
    ) : (
      contentProp
    )

  return (
    <>
      <div
        className={cn({
          [containerClassName!]: !!containerClassName
        })}
      >
        {children}
      </div>
      <Flex
        direction='row'
        gap='s'
        alignItems='center'
        backgroundColor='accent'
        pv='s'
        ph='m'
        borderRadius='m'
      >
        {leftIcon}
        <Text color='staticWhite' size='s' strength='strong'>
          {content}
        </Text>
        {rightIcon}
      </Flex>
    </>
  )
}

export default Toast
