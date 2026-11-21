import { useArtistCreatedFanClub, useCurrentUserId } from '~/api/'

type UseAccessAndRemixSettingsProps = {
  isUpload: boolean
  isRemix: boolean
  isAlbum?: boolean
  isInitiallyUnlisted: boolean
  isScheduledRelease?: boolean
  isPublishDisabled?: boolean
}

export const useHasNoTokens = () => {
  const { data: userId } = useCurrentUserId()
  const { data: coin, isLoading } = useArtistCreatedFanClub(userId)

  return !isLoading && !coin
}

export const useAccessAndRemixSettings = ({
  isUpload,
  isRemix,
  isAlbum = false,
  isInitiallyUnlisted,
  isScheduledRelease = false,
  isPublishDisabled = false
}: UseAccessAndRemixSettingsProps) => {
  const isInitiallyHidden = !isUpload && isInitiallyUnlisted
  const shouldDisablePublish = isPublishDisabled && isInitiallyHidden

  const hasNoTokens = useHasNoTokens()

  return {
    disableUsdcGate: isRemix || shouldDisablePublish,
    disableFollowGate: isAlbum || isRemix || shouldDisablePublish,
    disableTokenGate: isAlbum || isRemix || hasNoTokens || shouldDisablePublish,
    disableTokenGateFields:
      isAlbum || isRemix || hasNoTokens || shouldDisablePublish,
    disableHidden: isAlbum || isScheduledRelease
  }
}
