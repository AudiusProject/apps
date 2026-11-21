export const BPM_REGEX = /^\d{0,3}(\.\d{0,2})?$/
export const isBpmValid = (bpm: string): boolean => {
  const regex = BPM_REGEX
  return regex.test(bpm)
}
