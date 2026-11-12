/**
 * Finds the closest ancestor of `el` (including `el` itself) matching the
 * given selector, or null if there is none.
 * @param el
 * @param selector query selector
 */
export const findAncestor = (el: Element | null, selector: string) => {
  return el?.closest(selector) ?? null
}
