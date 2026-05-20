export type CastMethod = 'airplay' | 'chromecast'

export type CastState = {
  isCasting: boolean
  method: CastMethod | null
  deviceName: string | null
}
