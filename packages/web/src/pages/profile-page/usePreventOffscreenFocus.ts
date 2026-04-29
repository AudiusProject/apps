import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
  '[contenteditable="true"]'
].join(',')

const ORIGINAL_TAB_INDEX_ATTR = 'data-profile-original-tabindex'

const getVisibleHorizontalBounds = (root: HTMLElement) => {
  const rootRect = root.getBoundingClientRect()
  return {
    left: Math.max(rootRect.left, 0),
    right: Math.min(rootRect.right, window.innerWidth)
  }
}

const isHorizontallyVisible = (element: HTMLElement, root: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return true

  const bounds = getVisibleHorizontalBounds(root)
  return rect.right > bounds.left && rect.left < bounds.right
}

const restoreTabIndex = (element: HTMLElement) => {
  const originalTabIndex = element.getAttribute(ORIGINAL_TAB_INDEX_ATTR)
  if (originalTabIndex === null) return

  if (originalTabIndex === '') {
    element.removeAttribute('tabindex')
  } else {
    element.setAttribute('tabindex', originalTabIndex)
  }
  element.removeAttribute(ORIGINAL_TAB_INDEX_ATTR)
}

const suppressTabIndex = (element: HTMLElement) => {
  if (element.hasAttribute(ORIGINAL_TAB_INDEX_ATTR)) return

  element.setAttribute(
    ORIGINAL_TAB_INDEX_ATTR,
    element.getAttribute('tabindex') ?? ''
  )
  element.setAttribute('tabindex', '-1')
}

const syncOffscreenFocusables = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR).forEach((element) => {
    if (isHorizontallyVisible(element, root)) {
      restoreTabIndex(element)
    } else {
      suppressTabIndex(element)
    }
  })
}

export const usePreventOffscreenFocus = (
  rootRef: RefObject<HTMLElement | null>
) => {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === 'undefined') return

    let animationFrame: number | null = null

    const scheduleSync = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        syncOffscreenFocusables(root)
      })
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        root.contains(target) &&
        !isHorizontallyVisible(target, root)
      ) {
        target.blur()
        scheduleSync()
      }
    }

    scheduleSync()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleSync)
        : null
    resizeObserver?.observe(root)

    const mutationObserver = new MutationObserver(scheduleSync)
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'tabindex']
    })

    window.addEventListener('resize', scheduleSync)
    window.addEventListener('scroll', scheduleSync, true)
    root.addEventListener('focusin', handleFocusIn)

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.removeEventListener('scroll', scheduleSync, true)
      root.removeEventListener('focusin', handleFocusIn)
      root
        .querySelectorAll<HTMLElement>(`[${ORIGINAL_TAB_INDEX_ATTR}]`)
        .forEach(restoreTabIndex)
    }
  }, [rootRef])
}
