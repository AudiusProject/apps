import { DragEvent, ReactNode, useCallback } from 'react'

import { ID } from '@audius/common/models'
import { Slot } from '@radix-ui/react-slot'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { DragDropKind, drag, drop } from 'store/dragndrop/slice'

import styles from './Draggable.module.css'
const isFirefox = () => navigator.userAgent.includes('Firefox')

const messages = {
  defaultText: 'Untitled'
}

export type DraggableProps = {
  className?: string
  isDisabled?: boolean
  isOwner?: boolean
  text?: string
  link?: string
  kind: DragDropKind
  id: ID | string
  index?: number
  children: ReactNode
  onDrag?: () => void
  onDrop?: () => void
  asChild?: boolean
}

export const Draggable = (props: DraggableProps) => {
  const {
    className,
    isDisabled,
    text = messages.defaultText,
    kind,
    link = 'https://audius.co',
    id,
    index,
    isOwner,
    onDrag,
    onDrop,
    children,
    asChild,
    ...other
  } = props
  const dispatch = useDispatch()

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.stopPropagation()
      dispatch(drag({ kind, id, isOwner, index }))

      const dt = e.dataTransfer
      dt.effectAllowed = 'copy'

      if (!isFirefox()) {
        dt.setData('text/uri-list', link)
        dt.setData('text/plain', link)
      }

      if (dt.setDragImage) {
        const wrapper = document.createElement('div')
        wrapper.setAttribute('id', 'ghost')

        const content = document.createElement('div')
        content.innerText = text

        wrapper.append(content)
        document.body.append(wrapper)

        dt.setDragImage(wrapper, 0, 0)
      }
      onDrag?.()
    },
    [dispatch, kind, id, isOwner, index, link, text, onDrag]
  )

  const handleDragEnd = useCallback(() => {
    const dragGhostElement = document.getElementById('ghost')
    if (dragGhostElement) {
      dragGhostElement.outerHTML = ''
    }
    dispatch(drop())
    onDrop?.()
  }, [dispatch, onDrop])

  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      draggable={!isDisabled}
      className={cn(className, styles.draggable)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      {...other}
    >
      {children}
    </Comp>
  )
}
