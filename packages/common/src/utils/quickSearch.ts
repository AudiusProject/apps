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
  { mood: Mood.Fiery, bpm: bpmDescriptions.UPBEAT },
  { genre: Genre.Electronic, mood: Mood.Aggressive },
  { genre: Genre.Alternative, key: 'E Minor' },
  { genre: Genre.HipHopRap, bpm: bpmDescriptions.MEDIUM },
  { genre: Genre.Techno, bpm: bpmDescriptions.UPBEAT },
  { genre: Genre.LoFi, bpm: bpmDescriptions.SLOW },
  { genre: Genre.Dubstep, bpm: bpmDescriptions._140 },
  { genre: Genre.Rock, isVerified: true },
  { genre: Genre.Alternative, mood: Mood.Romantic },
  { key: 'A Minor', bpm: bpmDescriptions.SLOW }
]
