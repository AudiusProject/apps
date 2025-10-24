import { useMemo } from 'react'

import {
  useCurrentUserId,
  useUserAlbums,
  useCurrentAccountUser
} from '@audius/common/api'
import {
  Collection,
  Track,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  IconCart,
  IconSparkles,
  IconVisibilityHidden,
  IconVisibilityPublic
} from '@audius/harmony'
import { useSelector } from 'react-redux'
import { Nullable } from 'vitest'

import { makeGetDashboard } from '../store/selectors'

import {
  AlbumFilters,
  DataSourceAlbum,
  DataSourceTrack,
  TrackFilters
} from './types'

const messages = {
  public: 'Public',
  premium: 'Premium',
  specialAcess: 'SpecialAccess',
  gated: 'Gated',
  hidden: 'Hidden'
}

/** ------------------------ Tracks ------------------------ */

const formatTrackMetadata = (metadata: Track, i: number): DataSourceTrack => {
  return {
    ...metadata,
    key: `${metadata.title}_${metadata.dateListened}_${i}`,
    name: metadata.title,
    date: metadata.created_at,
    time: metadata.duration,
    saves: metadata.save_count,
    reposts: metadata.repost_count,
    plays: metadata.play_count,
    comments: metadata.comment_count
  }
}

/** Returns the logged-in user's tracks, formatted for Artist Dashboard tracks table */
export const useFormattedTrackData = () => {
  const { data: accountUser } = useCurrentAccountUser()
  const { tracks } = useSelector(makeGetDashboard(accountUser))
  const tracksFormatted = useMemo(() => {
    return tracks
      .map((track: Track, i: number) => formatTrackMetadata(track, i))
      .filter((meta) => !meta.is_invalid)
  }, [tracks])
  return tracksFormatted
}

/**
 * Returns a set of arrays that contain the logged-in user's tracks filtered by
 * whether the tracks are public, special access, hidden, or premium.
 * Also returns a boolean indicating whether the user has only one type of track.
 */
const useSegregatedTrackData = () => {
  const tracks = useFormattedTrackData()
  const {
    hasOnlyOneSection,
    publicTracks,
    specialAccessTracks,
    hiddenTracks,
    premiumTracks
  } = useMemo(() => {
    const publicTracks = tracks.filter(
      (data) => data.is_unlisted === false && !data.is_stream_gated
    )
    const specialAccessTracks = tracks.filter(
      (data) =>
        data.is_stream_gated &&
        (isContentFollowGated(data.stream_conditions) ||
          isContentTipGated(data.stream_conditions))
    )
    const hiddenTracks = tracks.filter((data) => !!data.is_unlisted)
    const premiumTracks = tracks.filter(
      (data) =>
        data.is_stream_gated &&
        isContentUSDCPurchaseGated(data.stream_conditions)
    )

    const arrays = [
      publicTracks,
      specialAccessTracks,
      hiddenTracks,
      premiumTracks
    ]
    const nonEmptyArrays = arrays.filter((arr) => arr.length > 0)
    const hasOnlyOneSection = nonEmptyArrays.length <= 1

    return {
      hasOnlyOneSection,
      publicTracks,
      specialAccessTracks,
      hiddenTracks,
      premiumTracks
    }
  }, [tracks])

  return {
    hasOnlyOneSection,
    publicTracks,
    specialAccessTracks,
    hiddenTracks,
    premiumTracks
  }
}

/**
 * Returns the logged-in user's tracks, filtered by the selected filter and search text.
 */
export const useFilteredTrackData = ({
  selectedFilter,
  filterText
}: {
  selectedFilter: Nullable<TrackFilters>
  filterText: string
}) => {
  const tracks = useFormattedTrackData()
  const { publicTracks, specialAccessTracks, hiddenTracks, premiumTracks } =
    useSegregatedTrackData()

  const filteredData = useMemo(() => {
    let filteredData: DataSourceTrack[] = tracks
    switch (selectedFilter) {
      case TrackFilters.PUBLIC:
        filteredData = publicTracks
        break
      case TrackFilters.PREMIUM:
        filteredData = premiumTracks
        break
      case TrackFilters.SPECIAL_ACCESS:
        filteredData = specialAccessTracks
        break
      case TrackFilters.HIDDEN:
        filteredData = hiddenTracks
        break
      default:
        filteredData = tracks
        break
    }

    if (filterText) {
      filteredData = filteredData.filter((data) =>
        data.name.toLowerCase().includes(filterText.toLowerCase())
      )
    }

    return filteredData
  }, [
    filterText,
    hiddenTracks,
    premiumTracks,
    publicTracks,
    selectedFilter,
    specialAccessTracks,
    tracks
  ])

  return filteredData
}

/**
 * Returns a list of filter options for the logged-in user's tracks, eg.
 * the "hidden" option will only be available if the user has hidden tracks.
 */
export const useArtistDashboardTrackFilters = () => {
  const {
    specialAccessTracks,
    hiddenTracks,
    premiumTracks,
    hasOnlyOneSection
  } = useSegregatedTrackData()

  const filterButtonOptions = useMemo(() => {
    const filterButtonTrackOptions = [
      {
        id: TrackFilters.PUBLIC,
        label: messages.public,
        icon: IconVisibilityPublic,
        value: TrackFilters.PUBLIC
      }
    ]
    if (premiumTracks.length) {
      filterButtonTrackOptions.push({
        id: TrackFilters.PREMIUM,
        label: messages.premium,
        icon: IconCart,
        value: TrackFilters.PREMIUM
      })
    }
    if (specialAccessTracks.length) {
      filterButtonTrackOptions.push({
        id: TrackFilters.SPECIAL_ACCESS,
        label: messages.specialAcess,
        icon: IconSparkles,
        value: TrackFilters.SPECIAL_ACCESS
      })
    }
    if (hiddenTracks.length) {
      filterButtonTrackOptions.push({
        id: TrackFilters.HIDDEN,
        label: messages.hidden,
        icon: IconVisibilityHidden,
        value: TrackFilters.HIDDEN
      })
    }
    return filterButtonTrackOptions
  }, [hiddenTracks, premiumTracks, specialAccessTracks])

  return { filterButtonOptions, hasOnlyOneSection }
}

/** ------------------------ Albums ------------------------ */

const formatAlbumMetadata = (album: Collection): DataSourceAlbum => {
  return {
    ...album,
    key: String(album.playlist_id),
    name: album.playlist_name,
    date: album.created_at,
    saves: album.save_count,
    reposts: album.repost_count
  }
}

/** Returns the logged-in user's albums, formatted for Artist Dashboard albums table */
export const useFormattedAlbumData = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: albums } = useUserAlbums({
    userId: currentUserId,
    pageSize: 50
  })
  const albumsFormatted = useMemo(() => {
    return albums?.map((album) => formatAlbumMetadata(album))
  }, [albums])
  return albumsFormatted ?? []
}

const useSegregatedAlbumData = () => {
  const albums = useFormattedAlbumData()

  const { hasOnlyOneSection, publicAlbums, hiddenAlbums, premiumAlbums } =
    useMemo(() => {
      const publicAlbums = albums.filter(
        (data) => data.is_private === false && !data.is_stream_gated
      )
      const hiddenAlbums = albums.filter((data) => !!data.is_private)
      const premiumAlbums = albums.filter(
        (data) =>
          data.is_stream_gated &&
          isContentUSDCPurchaseGated(data.stream_conditions)
      )

      const arrays = [publicAlbums, hiddenAlbums, premiumAlbums]
      const nonEmptyArrays = arrays.filter((arr) => arr.length > 0)
      const hasOnlyOneSection = nonEmptyArrays.length <= 1

      return {
        hasOnlyOneSection,
        publicAlbums,
        hiddenAlbums,
        premiumAlbums
      }
    }, [albums])

  return { hasOnlyOneSection, publicAlbums, hiddenAlbums, premiumAlbums }
}

/**
 * Returns the logged-in user's albums, filtered by the selected filter and search text.
 */
export const useFilteredAlbumData = ({
  selectedFilter,
  filterText
}: {
  selectedFilter: Nullable<AlbumFilters>
  filterText: string
}) => {
  const albums = useFormattedAlbumData()
  const { publicAlbums, hiddenAlbums, premiumAlbums } = useSegregatedAlbumData()

  const filteredData = useMemo(() => {
    let filteredData: DataSourceAlbum[] = albums
    switch (selectedFilter) {
      case AlbumFilters.PUBLIC:
        filteredData = publicAlbums
        break
      case AlbumFilters.PREMIUM:
        filteredData = premiumAlbums
        break
      case AlbumFilters.HIDDEN:
        filteredData = hiddenAlbums
        break
      default:
        filteredData = albums
        break
    }

    if (filterText) {
      filteredData = filteredData.filter((data) =>
        data.name.toLowerCase().includes(filterText.toLowerCase())
      )
    }

    return filteredData
  }, [
    albums,
    filterText,
    hiddenAlbums,
    premiumAlbums,
    publicAlbums,
    selectedFilter
  ])

  return filteredData
}

/**
 * Returns a list of filter options for the logged-in user's albums, eg.
 * the "hidden" option will only be available if the user has hidden albums.
 */
export const useArtistDashboardAlbumFilters = () => {
  const { hiddenAlbums, premiumAlbums, hasOnlyOneSection } =
    useSegregatedAlbumData()

  const filterButtonOptions = useMemo(() => {
    const filterButtonAlbumOptions = [
      {
        id: AlbumFilters.PUBLIC,
        label: messages.public,
        icon: IconVisibilityPublic,
        value: AlbumFilters.PUBLIC
      }
    ]
    if (premiumAlbums.length) {
      filterButtonAlbumOptions.push({
        id: AlbumFilters.PREMIUM,
        label: messages.premium,
        icon: IconCart,
        value: AlbumFilters.PREMIUM
      })
    }
    if (hiddenAlbums.length) {
      filterButtonAlbumOptions.push({
        id: AlbumFilters.HIDDEN,
        label: messages.hidden,
        icon: IconVisibilityHidden,
        value: AlbumFilters.HIDDEN
      })
    }

    return filterButtonAlbumOptions
  }, [hiddenAlbums, premiumAlbums])

  return { filterButtonOptions, hasOnlyOneSection }
}
