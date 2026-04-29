import { useEffect } from 'react'

import { size, throttle } from 'lodash'

export enum ModifierKeys {
  CMD = 0,
  CTRL = 1,
  SHIFT = 2,
  ALT = 3
}

type ModifierHandler = {
  cb: (e?: KeyboardEvent) => void
  or?: ModifierKeys[]
  and?: ModifierKeys[]
}

type Handler = (e?: KeyboardEvent) => void
export type Mapping = {
  [key: number]: Handler | ModifierHandler
}

const interactiveSelector = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="textbox"]'
].join(',')

function isInteractiveHotkeyTarget(element: Element | EventTarget | null) {
  if (!(element instanceof HTMLElement)) return false

  return element.closest(interactiveSelector) !== null
}

/**
 * Checks whether the DOM is in a state where a global hotkey press is allowed.
 * Focused controls should own Space/Enter/arrow keys so keyboard activation and
 * native widgets are not intercepted by app-level playback shortcuts.
 * @returns whether or not a global hotkey press is allowed.
 */
function allowGlobalHotkeyPress(e: KeyboardEvent) {
  return (
    !isInteractiveHotkeyTarget(document.activeElement) &&
    !isInteractiveHotkeyTarget(e.target)
  )
}

function isModifierPressed(modifier: ModifierKeys, e: KeyboardEvent) {
  if (modifier === ModifierKeys.CMD) return e.metaKey
  if (modifier === ModifierKeys.CTRL) return e.ctrlKey
  if (modifier === ModifierKeys.SHIFT) return e.shiftKey
  if (modifier === ModifierKeys.ALT) return e.altKey
  return false
}

function isAnyModifierPressed(e: KeyboardEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}

function fireHotkey(
  e: KeyboardEvent,
  mapping: Mapping,
  preventDefault: boolean
) {
  if (allowGlobalHotkeyPress(e) && e.keyCode in mapping) {
    if (size(mapping[e.keyCode]) > 1) {
      const cb = (mapping[e.keyCode] as ModifierHandler).cb
      const or = (mapping[e.keyCode] as ModifierHandler).or
      const and = (mapping[e.keyCode] as ModifierHandler).and

      let satisfiedOr = true
      if (or) {
        satisfiedOr = false
        or.forEach((modifier) => {
          if (isModifierPressed(modifier as ModifierKeys, e)) satisfiedOr = true
        })
      }

      let satisfiedAnd = true
      if (and) {
        and.forEach((modifier) => {
          if (!isModifierPressed(modifier, e)) satisfiedAnd = false
        })
      }

      if (satisfiedOr && satisfiedAnd) {
        if (preventDefault) e.preventDefault()
        cb(e)
      }
    } else {
      // If no modifier keys are required, abort if any are pressed.
      if (isAnyModifierPressed(e)) return
      // Otherwise, fire the hotkey.
      if (preventDefault) e.preventDefault()
      ;(mapping[e.keyCode] as Handler)(e)
    }
  }
}

/**
 * Sets up hotkeys for a component. Should generally be called in componentDidMount.
 * @param mapping the hotkey mapping keycodes to callback.
 * @param throttleMs the number of milliseconds to throttle keydown events with.
 * For example:
 *  setupHotkeys({32: this.playMusic})  // fires playMusic() on 'space'
 *
 * The mapping values may be an object with three fields:
 *  cb: the callback to fire
 *  or: modifier keys that must be OR'd with the hotkey
 *  and: modifier keys that must be AND'd with the hotkey
 *
 * For example:
 *  setupHotkeys({32: {cb: this.playMusic, or: [CMD, CTRL]})
 *    // fires on 'cmd+space' or 'ctrl+space'
 *  setupHotkeys({32: {cb: this.playMusic, and: [CMD, CTRL]})
 *    // fires on 'cmd+ctrl+space'
 *  setupHotkeys({32: {cb: this.playMusic, or: [ALT, CTRL], and: [CMD, SHIFT]})
 *    // fires on 'cmd+shift+alt+space' or 'cmd+shift+ctrl+space'\
 * @returns the event listener function
 */
export function setupHotkeys(
  mapping: Mapping,
  throttleMs = 100,
  preventDefault = true
) {
  const hotkeyHook = (e: KeyboardEvent) => {
    fireHotkey(e, mapping, preventDefault)
  }
  const throttledHook = (e: KeyboardEvent) =>
    throttle(hotkeyHook, throttleMs, { leading: true })(e)
  document.addEventListener('keydown', throttledHook, false)
  return throttledHook
}

/**
 * Removes a hotkey event listener.
 * @param {function} hook the function hook returned by setupHotkeys.
 */
export function removeHotkeys(hook: (e: KeyboardEvent) => void) {
  document.removeEventListener('keydown', hook, false)
}

export const useHotkeys = (mapping: Mapping) => {
  useEffect(() => {
    const hook = setupHotkeys(mapping)
    return () => {
      removeHotkeys(hook)
    }
  }, [mapping])
}
