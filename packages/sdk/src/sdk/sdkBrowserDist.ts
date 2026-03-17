import { ChallengeId } from './api/challenges/types'
import { developmentConfig } from './config/development'
import { productionConfig } from './config/production'
import { createSdk } from './createSdk'
import { Genre } from './types/Genre'
import { Mood } from './types/Mood'
import { ParseRequestError } from './utils/parseParams'
export const sdk = createSdk
;(window as any).audiusSdk = sdk
;(window as any).audiusSdk.config = {
  production: productionConfig,
  development: developmentConfig
}
;(window as any).audiusSdk.ParseRequestError = ParseRequestError
;(window as any).audiusSdk.Genre = Genre
;(window as any).audiusSdk.Mood = Mood
;(window as any).audiusSdk.ChallengeId = ChallengeId
