import { useCurrentTrack } from '@audius/common/hooks'
import { Genre } from '@audius/common/utils'

import ForwardSkipButton, { ForwardSkipButtonProps } from './ForwardSkipButton'
import NextButton, { NextButtonProps } from './NextButton'

type NextButtonProviderProps = NextButtonProps | ForwardSkipButtonProps

const NextButtonProvider = (props: NextButtonProviderProps) => {
  const track = useCurrentTrack()
  const isLongFormContent =
    track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
  return isLongFormContent ? (
    <ForwardSkipButton {...props} />
  ) : (
    <NextButton {...props} />
  )
}

export default NextButtonProvider
