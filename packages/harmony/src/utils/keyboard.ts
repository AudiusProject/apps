import type { KeyboardEvent } from 'react'

type KeyboardEventLike = {
  key: string
}

export const isKeyboardActivationKey = (event: KeyboardEventLike) =>
  event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar'

type KeyboardActivationOptions<T extends HTMLElement> = {
  onActivate?: (event: KeyboardEvent<T>) => void
  onKeyDown?: (event: KeyboardEvent<T>) => void
  disabled?: boolean
  stopPropagation?: boolean
  preventDefault?: boolean
  allowFromDescendants?: boolean
}

export const createKeyboardActivationHandler =
  <T extends HTMLElement = HTMLElement>({
    onActivate,
    onKeyDown,
    disabled = false,
    stopPropagation = true,
    preventDefault = true,
    allowFromDescendants = false
  }: KeyboardActivationOptions<T>) =>
  (event: KeyboardEvent<T>) => {
    onKeyDown?.(event)

    if (
      disabled ||
      event.defaultPrevented ||
      !isKeyboardActivationKey(event) ||
      (!allowFromDescendants && event.currentTarget !== event.target)
    ) {
      return
    }

    if (preventDefault) {
      event.preventDefault()
    }
    if (stopPropagation) {
      event.stopPropagation()
    }

    onActivate?.(event)
  }
