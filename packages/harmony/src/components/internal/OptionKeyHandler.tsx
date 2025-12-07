import { RefObject, useState, ReactNode, useEffect } from 'react'

import { IconComponent } from '~harmony/components/icon'

type OptionType<Value extends string> = {
  value: Value
  /**
   * The label to display. If not provided, uses the value.
   */
  label?: string
  helperText?: string
  icon?: IconComponent
  /**
   * A leading element to display before the option label. Useful for icons/emojis
   */
  leadingElement?: JSX.Element
  /**
   * A leading element to display before the filter button label
   */
  labelLeadingElement?: JSX.Element
}

type OptionKeyHandlerProps<Value extends string> = {
  children: (activeValue: Value | null) => ReactNode
  disabled?: boolean
  onChange: (value: Value) => void
  optionRefs: RefObject<HTMLButtonElement[]>
  options: OptionType<Value>[]
  scrollRef: RefObject<HTMLDivElement | null>
  initialActiveIndex?: number
}

export const OptionKeyHandler = <Value extends string>(
  props: OptionKeyHandlerProps<Value>
) => {
  const {
    disabled,
    options,
    onChange,
    optionRefs,
    scrollRef,
    children,
    initialActiveIndex = null
  } = props
  const [activeIndex, setActiveIndex] = useState<number | null>(
    initialActiveIndex
  )
  const activeValue = activeIndex !== null ? options[activeIndex]?.value : null

  useEffect(() => {
    const adjustScrollPosition = (newIndex: number | null) => {
      if (newIndex !== null) {
        if (optionRefs.current) {
          optionRefs.current[newIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      } else {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) {
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.stopPropagation()
          event.preventDefault()
          setActiveIndex((prevIndex) => {
            const getNewIndex = () => {
              if (prevIndex === null) {
                return options.length - 1
              }

              return prevIndex > 0 ? prevIndex - 1 : null
            }

            const newIndex = getNewIndex()
            adjustScrollPosition(newIndex)

            return newIndex
          })
          break
        case 'ArrowDown':
          event.stopPropagation()
          event.preventDefault()
          setActiveIndex((prevIndex) => {
            const getNewIndex = () => {
              if (prevIndex === null) {
                return 0
              }

              return prevIndex < options.length - 1 ? prevIndex + 1 : null
            }

            const newIndex = getNewIndex()
            adjustScrollPosition(newIndex)

            return newIndex
          })
          break
        case 'Enter':
          event.stopPropagation()
          event.preventDefault()
          if (activeIndex !== null && options[activeIndex]) {
            onChange(options[activeIndex].value)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [disabled, options, activeIndex, scrollRef, optionRefs, onChange])

  return <>{children(activeValue)}</>
}
