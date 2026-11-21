import { useState, useCallback } from 'react'

import { Nullable } from '@audius/common/utils'
import {
  SelectablePill,
  IconSearch,
  Paper,
  Flex,
  TextInput,
  TextInputSize,
  FilterButton
} from '@audius/harmony'

import { ArtistDashboardAlbumsTab } from './ArtistDashboardAlbumsTab'
import { ArtistDashboardTracksTab } from './ArtistDashboardTracksTab'
import {
  useArtistDashboardAlbumFilters,
  useArtistDashboardTrackFilters,
  useFormattedAlbumData,
  useFormattedTrackData
} from './hooks'
import { AlbumFilters, TrackFilters } from './types'

const messages = {
  allReleases: 'All Releases',
  tracks: 'Tracks',
  albums: 'Albums',
  search: (type: Pills) =>
    `Search ${type === Pills.TRACKS ? 'Tracks' : 'Albums'}`
}

enum Pills {
  TRACKS,
  ALBUMS
}

export const ArtistContentSection = () => {
  const [filterText, setFilterText] = useState('')
  const [selectedPill, setSelectedPill] = useState(Pills.TRACKS)
  const [selectedTrackFilter, setSelectedTrackFilter] =
    useState<Nullable<TrackFilters>>(null)
  const [selectedAlbumFilter, setSelectedAlbumFilter] =
    useState<Nullable<AlbumFilters>>(null)
  const isTracks = selectedPill === Pills.TRACKS
  const tracks = useFormattedTrackData()
  const albums = useFormattedAlbumData()

  const {
    filterButtonOptions: filterButtonTrackOptions,
    hasOnlyOneSection: hasOnlyOneTrackSection
  } = useArtistDashboardTrackFilters()
  const {
    filterButtonOptions: filterButtonAlbumOptions,
    hasOnlyOneSection: hasOnlyOneAlbumSection
  } = useArtistDashboardAlbumFilters()

  const filterButtonOptions = isTracks
    ? filterButtonTrackOptions
    : filterButtonAlbumOptions
  const isFilterButtonDisabled =
    (isTracks && hasOnlyOneTrackSection) ||
    (!isTracks && hasOnlyOneAlbumSection)

  const onClickPill = useCallback(
    (pill: Pills) => {
      setSelectedPill(pill)
      setFilterText('')

      if (!isTracks && pill === Pills.TRACKS) {
        setSelectedAlbumFilter(null)
      } else if (isTracks && pill === Pills.ALBUMS) {
        setSelectedTrackFilter(null)
      }
    },
    [isTracks]
  )

  const handleSelectFilter = (value: string) => {
    if (isTracks) {
      setSelectedTrackFilter(value as TrackFilters)
    } else {
      setSelectedAlbumFilter(value as AlbumFilters)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFilterText(val)
  }

  if (!tracks.length && !albums.length) return null

  return (
    <Paper w='100%' direction='column' mt='xl' borderRadius='l'>
      <Flex ph='2xl' pv='l' justifyContent='space-between'>
        <Flex gap='2xl'>
          <Flex gap='s'>
            <SelectablePill
              isSelected={selectedPill === Pills.TRACKS}
              label={messages.tracks}
              size='large'
              onClick={() => onClickPill(Pills.TRACKS)}
            />
            <SelectablePill
              isSelected={selectedPill === Pills.ALBUMS}
              label={messages.albums}
              size='large'
              onClick={() => onClickPill(Pills.ALBUMS)}
            />
          </Flex>
          <FilterButton
            onChange={handleSelectFilter}
            value={isTracks ? selectedTrackFilter : selectedAlbumFilter}
            label={messages.allReleases}
            options={filterButtonOptions}
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
              transformOrigin: { vertical: 'top', horizontal: 'left' }
            }}
            disabled={isFilterButtonDisabled}
          />
        </Flex>
        <Flex>
          <TextInput
            css={{ height: 32 }}
            IconProps={{ size: 'm' }}
            placeholder={messages.search(selectedPill)}
            label={messages.search(selectedPill)}
            value={filterText}
            onChange={handleFilterChange}
            size={TextInputSize.SMALL}
            startIcon={IconSearch}
          />
        </Flex>
      </Flex>
      {selectedPill === Pills.TRACKS ? (
        <ArtistDashboardTracksTab
          selectedFilter={selectedTrackFilter}
          filterText={filterText}
        />
      ) : (
        <ArtistDashboardAlbumsTab
          selectedFilter={selectedAlbumFilter}
          filterText={filterText}
        />
      )}
    </Paper>
  )
}
