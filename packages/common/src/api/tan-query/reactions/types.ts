export type ReactionTypes = '😍' | '🔥' | '🥳' | '🤯'

// The order these reactions appear in the web + mobile UI
export const reactionOrder: ReactionTypes[] = ['😍', '🔥', '🥳', '🤯']

export const reactionsMap: { [k in ReactionTypes]: number } = {
  '😍': 1,
  '🔥': 2,
  '🥳': 3,
  '🤯': 4
}
