import { ReactionTypes } from '@audius/sdk'

export const reactionOrder: ReactionTypes[] = ['😍', '🔥', '🥳', '🤯']

export const reactionsMap: { [k in ReactionTypes]: number } = {
  '😍': 1,
  '🔥': 2,
  '🥳': 3,
  '🤯': 4
}

export { ReactionTypes } from '@audius/sdk'
