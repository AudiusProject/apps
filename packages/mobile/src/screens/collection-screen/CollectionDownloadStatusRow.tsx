import { useLayoutEffect, useState } from 'react'

import { useCollection, useCurrentUserId } from '@audius/common/api'
import { useThrottledCallback } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { reachabilitySelectors } from '@audius/common/store'
import { pick } from 'lodash'
import { useSelector, useDispatch } from 'react-redux'

import { getCollectionDownloadStatus } from 'app/components/offline-downloads/CollectionDownloadStatusIndicator'
import { useProxySelector } from 'app/hooks/useProxySelector'
import { setVisibility } from 'app/store/drawers/slice'
import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'
import {
  OfflineDownloadStatus,
  requestDownloadCollection
} from 'app/store/offline-downloads/slice'

import { DownloadStatusRowDisplay } from './DownloadStatusRowDisplay'
const { getIsReachable } = reachabilitySelectors

const TOGGLE_COOLDOWN_MS = 800

type CollectionDownloadStatusRowProps = {
  collectionId: ID
}

export const CollectionDownloadStatusRow = (
  props: CollectionDownloadStatusRowProps
) => {
  const { collectionId } = props
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(collection, [
        'playlist_id',
        'playlist_owner_id',
        'has_current_user_saved',
        'access',
        'playlist_contents'
      ])
  })
  const { playlist_owner_id, has_current_user_saved, access } =
    partialCollection ?? {}

  const isMarkedForDownload = useSelector((state) =>
    Boolean(getCollectionDownloadStatus(state, partialCollection))
  )

  const isSwitchDisabled = useSelector((state) => {
    const isReachable = getIsReachable(state)
    const isFavoritesMarkedForDownload = getIsCollectionMarkedForDownload(
      DOWNLOAD_REASON_FAVORITES
    )(state)
    return isFavoritesMarkedForDownload || !isReachable
  })

  const [downloadSwitchValue, setDownloadSwitchValue] =
    useState(isMarkedForDownload)

  const downloadStatus = useProxySelector(
    (state) => {
      const status =
        getCollectionDownloadStatus(state, partialCollection) ??
        OfflineDownloadStatus.INACTIVE

      return downloadSwitchValue && status === OfflineDownloadStatus.INACTIVE
        ? OfflineDownloadStatus.INIT
        : status
    },
    [collectionId, downloadSwitchValue]
  )
  const isAvailableForDownload =
    !!partialCollection &&
    (has_current_user_saved || playlist_owner_id === currentUserId) &&
    access?.stream

  useLayoutEffect(() => {
    setDownloadSwitchValue(isMarkedForDownload)
  }, [isMarkedForDownload])

  const handleDownloadSwitchValueChange = useThrottledCallback(
    (isDownloadEnabled: boolean) => {
      if (isDownloadEnabled) {
        dispatch(requestDownloadCollection({ collectionId }))
        setDownloadSwitchValue(true)
      } else {
        dispatch(
          setVisibility({
            drawer: 'RemoveDownloadedCollection',
            visible: true,
            data: { collectionId }
          })
        )
      }
    },
    [dispatch, collectionId],
    TOGGLE_COOLDOWN_MS
  )

  return (
    <DownloadStatusRowDisplay
      downloadStatus={downloadStatus}
      isAvailableForDownload={!!isAvailableForDownload}
      switchValue={downloadSwitchValue}
      handleSwitchChange={handleDownloadSwitchValueChange}
      disabled={isSwitchDisabled}
    />
  )
}
