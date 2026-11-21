import { BatchContext } from './types'

export const contextCacheResolver = () => {
  let lastContext: BatchContext | null = null

  return (context: BatchContext) => {
    if (
      lastContext &&
      Object.keys(context).every((key) =>
        Object.is(
          context[key as keyof BatchContext],
          lastContext?.[key as keyof BatchContext]
        )
      )
    ) {
      return lastContext
    }

    lastContext = context
    return context
  }
}
