import { Mood } from '@audius/sdk'

import { Genre } from './genres'

export type BPMDescription = {
  value: string
  description: string
}

const bpmDescriptions: Record<string, BPMDescription> = {
  SLOW: {
    value: '60-90',
    description: 'Slow'
  },
  MEDIUM: {
    value: '90-110',
    description: 'Medium'
  },
  UPBEAT: {
    value: '110-140',
    description: 'Upbeat'
  },
  _140: {
    value: '140',
    description: '140BPM'
  }
}

export type QuickSearchPreset = {
  genre?: Genre
  mood?: Mood
  bpm?: BPMDescription
  key?: string
  isVerified?: boolean
}

export const QUICK_SEARCH_PRESETS: QuickSearchPreset[] = [
  { mood: Mood.FIERY, bpm: bpmDescriptions.UPBEAT },
  { genre: Genre.ELECTRONIC, mood: Mood.AGGRESSIVE },
  { genre: Genre.ALTERNATIVE, key: 'E Minor' },
  { genre: Genre.HIP_HOP_RAP, bpm: bpmDescriptions.MEDIUM },
  { genre: Genre.TECHNO, bpm: bpmDescriptions.UPBEAT },
  { genre: Genre.LOFI, bpm: bpmDescriptions.SLOW },
  { genre: Genre.DUBSTEP, bpm: bpmDescriptions._140 },
  { genre: Genre.ROCK, isVerified: true },
  { genre: Genre.ALTERNATIVE, mood: Mood.ROMANTIC },
  { key: 'A Minor', bpm: bpmDescriptions.SLOW }
]
