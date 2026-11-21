export type ReactionTypes = '😍' | '🔥' | '🥳' | '🤯'

export const reactionOrder: ReactionTypes[] = ['😍', '🔥', '🥳', '🤯']

export const reactionsMap: { [k in ReactionTypes]: number } = {
  '😍': 1,
  '🔥': 2,
  '🥳': 3,
  '🤯': 4
}
