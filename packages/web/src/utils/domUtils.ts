import { Nullable } from '@audius/common/utils'

export const findAncestor = (el: Element, selector: string) => {
  if (el.closest) {
    return el.closest(selector)
  }
  while (
    el.parentElement &&
    // @ts-ignore
    !(el.parentElement.matches || el.parentElement.matchesSelector).call(
      el.parentElement,
      selector
    )
  ) {
    el = el.parentElement
  }
  return el
}

export const isDescendantElementOf = (
  descendant: any,
  ancestor: Nullable<HTMLElement>
) => {
  const descendantElement =
    descendant instanceof Element ? (descendant as Element) : null
  return ancestor?.contains(descendantElement)
}
