import { useCollection } from '~/api'
import { useTrack } from '~/api/tan-query/tracks/useTrack'
import { UploadType } from '~/store'
import { collectionPage, profilePage } from '~/utils/route'

export const useUploadCompletionRoute = ({
  id,
  uploadType,
  accountHandle
}: {
  id: number | null | undefined
  uploadType: UploadType
  accountHandle: string
}) => {
  const { data: track } = useTrack(id!, {
    enabled:
      !!id &&
      (uploadType === UploadType.INDIVIDUAL_TRACK ||
        uploadType === UploadType.INDIVIDUAL_TRACKS)
  })
  const { data: collection } = useCollection(id!, {
    enabled:
      !!id &&
      (uploadType === UploadType.ALBUM || uploadType === UploadType.PLAYLIST)
  })
  if (track) {
    return track.permalink
  }
  if (collection) {
    return collectionPage(
      null,
      null,
      null,
      collection.permalink,
      uploadType === UploadType.ALBUM
    )
  }
  return profilePage(accountHandle)
}
