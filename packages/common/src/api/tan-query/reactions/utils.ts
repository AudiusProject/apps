import { ReactionTypes, reactionsMap } from './types'

export const getReactionFromRawValue = (
  value: number | null
): ReactionTypes | null => {
  if (value === null) return null
  const val = (Object.entries(reactionsMap) as [ReactionTypes, number][]).find(
    ([_k, v]) => v === value
  )
  return val?.[0] ?? null
}

export const getRawValueFromReaction = (
  reaction: ReactionTypes | null
): number | null => {
  if (reaction === null) return null
  return reactionsMap[reaction] ?? null
}
