import { TrackMetadataForUpload } from '~/store'
import { Nullable } from '~/utils'

export enum StemCategory {
  INSTRUMENTAL = 'INSTRUMENTAL',
  LEAD_VOCALS = 'LEAD_VOCALS',
  MELODIC_LEAD = 'MELODIC_LEAD',
  PAD = 'PAD',
  SNARE = 'SNARE',
  KICK = 'KICK',
  HIHAT = 'HIHAT',
  PERCUSSION = 'PERCUSSION',
  SAMPLE = 'SAMPLE',
  BACKING_VOX = 'BACKING_VOX',
  BASS = 'BASS',
  OTHER = 'OTHER'
}

export const stemCategoryFriendlyNames = {
  [StemCategory.INSTRUMENTAL]: 'Instrumental',
  [StemCategory.LEAD_VOCALS]: 'Lead Vocals / A Capella',
  [StemCategory.MELODIC_LEAD]: 'Melodic Lead',
  [StemCategory.PAD]: 'Pad',
  [StemCategory.SNARE]: 'Snare',
  [StemCategory.KICK]: 'Kick',
  [StemCategory.HIHAT]: 'Hi-Hat',
  [StemCategory.PERCUSSION]: 'Percussion',
  [StemCategory.SAMPLE]: 'Sample',
  [StemCategory.BACKING_VOX]: 'Back Vocals / Ad-Libs',
  [StemCategory.BASS]: 'Bass',
  [StemCategory.OTHER]: 'Other'
}

export type StemUpload = {
  metadata: TrackMetadataForUpload
  category: Nullable<StemCategory>
  allowDelete: boolean
  allowCategorySwitch: boolean
}

export type StemUploadWithFile = StemUpload & {
  file: File
}
