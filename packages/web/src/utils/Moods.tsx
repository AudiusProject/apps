import { ReactElement } from 'react'

import { Mood } from '@audius/sdk'

export const moodEmojiMap: Record<Mood, string> = {
  Peaceful: 'dove-of-peace',
  Romantic: 'heart-with-arrow',
  Sentimental: 'crying-face',
  Tender: 'relieved-face',
  Easygoing: 'slightly-smiling-face',
  Yearning: 'eyes',
  Sophisticated: 'face-with-monocle',
  Sensual: 'face-throwing-a-kiss',
  Cool: 'smiling-face-with-sunglasses',
  Gritty: 'pouting-face',
  Melancholy: 'cloud-with-rain',
  Serious: 'neutral-face',
  Brooding: 'thinking-face',
  Fiery: 'fire',
  Defiant: 'smiling-face-with-horns',
  Aggressive: 'serious-face-with-symbols-covering-mouth',
  Rowdy: 'face-with-cowboy-hat',
  Excited: 'party-popper',
  Energizing: 'grinning-face-with-star-eyes',
  Empowering: 'flexed-biceps',
  Stirring: 'astonished-face',
  Upbeat: 'person-raising-both-hands-in-celebration',
  Other: 'shrug'
}

export type MoodInfo = {
  label: Mood
  value: Mood
  icon: ReactElement
}

export const MOODS: Record<Mood, MoodInfo> = Object.entries(
  moodEmojiMap
).reduce(
  (acc, [mood, emojiClass]) => {
    acc[mood as Mood] = {
      label: mood as Mood,
      value: mood as Mood,
      icon: <i className={`emoji ${emojiClass}`} />
    }
    return acc
  },
  {} as Record<Mood, MoodInfo>
)
