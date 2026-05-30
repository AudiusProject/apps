import {
  ClipboardEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useMemo,
  useState
} from 'react'

import { userTrackMetadataFromSDK } from '@audius/common/adapters'
import {
  SUGGESTED_TRACK_COUNT,
  useCollection,
  useCurrentUserId,
  useQueryContext,
  useSuggestedPlaylistTracks,
  useUser
} from '@audius/common/api'
import { useToggleTrack } from '@audius/common/hooks'
import { SquareSizes, ID, Track } from '@audius/common/models'
import {
  QueueSource,
  Queueable,
  cacheCollectionsActions,
  toastActions
} from '@audius/common/store'
import { getErrorMessage, getPathFromTrackUrl } from '@audius/common/utils'
import {
  Button,
  Divider,
  Flex,
  IconCaretDown,
  IconLink,
  IconPause,
  IconPlay,
  IconRefresh,
  Paper,
  TextInput,
  TextInputSize,
  useTheme,
  Image
} from '@audius/harmony'
import { OptionalId } from '@audius/sdk'
import { animated, useSpring } from '@react-spring/web'
import { useQueryClient } from '@tanstack/react-query'
import cn from 'classnames'
import { useDispatch } from 'react-redux'
import { useToggle } from 'react-use'

import { addTrackToDraftCollection } from 'components/collection/desktop/edit-mode/draftCollectionCache'
import { isDraftCollection } from 'components/collection/desktop/edit-mode/draftCollections'
import { UserLink } from 'components/link/UserLink'
import Skeleton from 'components/skeleton/Skeleton'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useMainContentRef } from 'pages/MainContentContext'

import styles from './SuggestedTracks.module.css'

const { addTrackToPlaylist } = cacheCollectionsActions
const { toast } = toastActions

const PLAYLIST_TRACK_LIMIT = 100
const INTER_DISPATCH_DELAY_MS = 30

const messages = {
  title: 'Add some tracks',
  addTrack: 'Add',
  added: 'Added',
  refresh: 'Refresh',
  expandLabel: 'Expand suggested tracks panel',
  collapseLabel: 'Collapse suggested tracks panel',
  trackAdded: (isAlbum: boolean) =>
    `Added to ${isAlbum ? 'Album' : 'Playlist'}`,
  // Add-by-URL paste field
  urlPlaceholder: 'Paste an Audius track URL to add',
  urlLabel: 'Add by URL',
  noValidLinks: 'No valid Audius track links found.',
  playlistFull: (limit: number) =>
    `This playlist already has ${limit} tracks — can't add more.`,
  resolveFailed: 'Could not load tracks. Check your connection and try again.',
  summary: ({
    added,
    duplicates,
    invalid,
    unresolved,
    overLimit
  }: {
    added: number
    duplicates: number
    invalid: number
    unresolved: number
    overLimit: number
  }) => {
    const parts: string[] = []
    if (added > 0) {
      parts.push(`Added ${added} ${added === 1 ? 'track' : 'tracks'}`)
    }
    if (duplicates > 0) {
      parts.push(`${duplicates} already in playlist`)
    }
    if (unresolved > 0) {
      parts.push(`${unresolved} not found`)
    }
    if (invalid > 0) {
      parts.push(`${invalid} invalid ${invalid === 1 ? 'link' : 'links'}`)
    }
    if (overLimit > 0) {
      parts.push(`${overLimit} skipped (playlist limit reached)`)
    }
    return parts.length > 0 ? parts.join(' • ') : 'No tracks were added.'
  }
}

type ParseResult = {
  permalinks: string[]
  invalidCount: number
}

/**
 * Split pasted/typed text into Audius track permalinks. Accepts one URL per
 * line, or comma/tab separated. Mirrors the previous AddTracksByUrlModal's
 * parser exactly.
 */
const parseTrackUrls = (raw: string): ParseResult => {
  const lines = raw
    .split(/[\n\r,\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const permalinks: string[] = []
  const seen = new Set<string>()
  let invalidCount = 0
  for (const line of lines) {
    const permalink = getPathFromTrackUrl(line)
    if (permalink) {
      if (!seen.has(permalink)) {
        seen.add(permalink)
        permalinks.push(permalink)
      }
    } else {
      invalidCount += 1
    }
  }
  return { permalinks, invalidCount }
}

type SuggestedTrackProps = {
  collectionId: ID
  track: Track
  queueEntries: Queueable[]
  onAddTrack: (trackId: ID) => void
}

const SuggestedTrackRow = (props: SuggestedTrackProps) => {
  const { collectionId, track, queueEntries, onAddTrack } = props
  const { track_id, title, owner_id } = track
  const { data: user } = useUser(owner_id)
  const { data: collection } = useCollection(collectionId)
  const { imageUrl: image } = useTrackCoverArt({
    trackId: track_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id: track_id,
    source: QueueSource.RECOMMENDED_TRACKS,
    entries: queueEntries
  })

  const trackIsInCollection = useMemo(
    () =>
      collection?.playlist_contents.track_ids.some(
        (trackId) => trackId.track === track_id
      ),
    [collection?.playlist_contents.track_ids, track_id]
  )

  const handleAddTrack = useCallback(() => {
    onAddTrack(track_id)
  }, [onAddTrack, track_id])

  const handleRowKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    },
    [togglePlay]
  )

  const handleAddClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      handleAddTrack()
    },
    [handleAddTrack]
  )

  return (
    <div
      className={styles.suggestedTrack}
      role='button'
      tabIndex={0}
      aria-label={isTrackPlaying ? `Pause ${title}` : `Play ${title}`}
      onClick={togglePlay}
      onKeyDown={handleRowKeyDown}
    >
      <div className={styles.trackDetails}>
        <div className={styles.artworkWrapper}>
          <Image className={styles.trackArtwork} src={image} />
          <span
            className={cn(styles.playOverlay, {
              [styles.isPlaying]: isTrackPlaying
            })}
            aria-hidden='true'
          >
            {isTrackPlaying ? (
              <IconPause size='s' color='staticWhite' />
            ) : (
              <IconPlay size='s' color='staticWhite' />
            )}
          </span>
        </div>
        <div className={styles.trackInfo}>
          <p className={styles.trackName}>{title}</p>
          {user ? (
            <span
              className={styles.userLinkWrapper}
              onClick={(e) => e.stopPropagation()}
            >
              <UserLink userId={user.user_id} size='s' />
            </span>
          ) : null}
        </div>
      </div>
      <Button
        variant='secondary'
        size='small'
        onClick={handleAddClick}
        onMouseDown={(e) => e.preventDefault()}
        disabled={trackIsInCollection}
      >
        {trackIsInCollection ? messages.added : messages.addTrack}
      </Button>
    </div>
  )
}

const SuggestedTrackSkeleton = () => {
  return (
    <div className={styles.suggestedTrackSkeleton}>
      <div className={styles.trackDetails}>
        <Skeleton className={styles.trackArtwork} />
        <div className={styles.trackInfo}>
          <Skeleton height='12px' width='150px' />
          <Skeleton height='12px' width='100px' />
        </div>
      </div>
    </div>
  )
}

type SuggestedTracksProps = {
  collectionId: ID
}

export const SuggestedTracks = (props: SuggestedTracksProps) => {
  const { collectionId } = props
  const dispatch = useDispatch()
  const mainContentRef = useMainContentRef()
  const queryClient = useQueryClient()
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const {
    suggestedTracks,
    onRefresh,
    onAddTrack: originalOnAddTrack
  } = useSuggestedPlaylistTracks(collectionId)
  const [isExpanded, toggleIsExpanded] = useToggle(false)
  const { motion } = useTheme()
  const isDraft = isDraftCollection(collectionId)

  // The set of track IDs already in the collection — used to filter
  // duplicates and compute remaining capacity before resolving pasted URLs.
  // Works for draft collections too: draftCollectionCache writes into the
  // same useCollection query key so playlist_contents stays in sync.
  const { data: existingTrackIdSet } = useCollection(collectionId, {
    select: (c) =>
      new Set<number>(c?.playlist_contents.track_ids.map((t) => t.track) ?? [])
  })

  const [urlInput, setUrlInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Preserve scroll position when adding track - prevents scroll-to-top on
  // optimistic update (e.g. from focus loss when Add button becomes disabled)
  const onAddTrack = useCallback(
    (trackId: ID) => {
      const scrollTop = mainContentRef?.current?.scrollTop ?? 0
      if (isDraft) {
        // Unsaved create flow: mutate the local draft, not the backend.
        addTrackToDraftCollection(queryClient, collectionId, trackId)
      } else {
        originalOnAddTrack(trackId)
      }
      // Restore scroll after React has committed the update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mainContentRef?.current != null) {
            mainContentRef.current.scrollTop = scrollTop
          }
        })
      })
    },
    [originalOnAddTrack, mainContentRef, isDraft, queryClient, collectionId]
  )

  // Resolve pasted/typed URLs into track IDs and add them. Mirrors the
  // now-removed AddTracksByUrlModal: same parser, same SDK call, same
  // dedupe + capacity checks, same summary toast. Routes to the draft
  // cache when the collection is unsaved (create flow), or dispatches the
  // backend save action otherwise — same branching the suggested-row Add
  // button uses.
  const addTracksFromText = useCallback(
    async (raw: string) => {
      if (!raw.trim()) return
      const { permalinks, invalidCount } = parseTrackUrls(raw)
      if (permalinks.length === 0) {
        if (invalidCount > 0) {
          dispatch(toast({ content: messages.noValidLinks }))
        }
        return
      }
      const currentTrackCount = existingTrackIdSet?.size ?? 0
      const remainingCapacity = Math.max(
        0,
        PLAYLIST_TRACK_LIMIT - currentTrackCount
      )
      if (remainingCapacity === 0) {
        dispatch(
          toast({ content: messages.playlistFull(PLAYLIST_TRACK_LIMIT) })
        )
        return
      }
      setIsAdding(true)
      try {
        const sdk = await audiusSdk()
        const { data: sdkData = [] } = await sdk.tracks.getBulkTracks({
          permalink: permalinks,
          userId: OptionalId.parse(currentUserId)
        })
        const resolvedTracks = sdkData
          .map((t) => userTrackMetadataFromSDK(t))
          .filter((t): t is NonNullable<typeof t> => t != null)

        const unresolved = permalinks.length - resolvedTracks.length
        const seenIds = new Set<number>()
        const newTracks: typeof resolvedTracks = []
        let duplicates = 0
        for (const track of resolvedTracks) {
          if (seenIds.has(track.track_id)) continue
          seenIds.add(track.track_id)
          if (existingTrackIdSet?.has(track.track_id)) {
            duplicates += 1
          } else {
            newTracks.push(track)
          }
        }

        const tracksToAdd = newTracks.slice(0, remainingCapacity)
        const overLimit = newTracks.length - tracksToAdd.length

        for (const track of tracksToAdd) {
          if (isDraft) {
            addTrackToDraftCollection(queryClient, collectionId, track.track_id)
          } else {
            dispatch(
              addTrackToPlaylist(track.track_id, collectionId, { silent: true })
            )
            // Space out backend dispatches so each saga's optimistic update
            // lands before the next one reads the playlist state.
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) =>
              setTimeout(resolve, INTER_DISPATCH_DELAY_MS)
            )
          }
        }

        dispatch(
          toast({
            content: messages.summary({
              added: tracksToAdd.length,
              duplicates,
              invalid: invalidCount,
              unresolved,
              overLimit
            })
          })
        )
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(getErrorMessage(err))
        dispatch(toast({ content: messages.resolveFailed }))
      } finally {
        setIsAdding(false)
      }
    },
    [
      audiusSdk,
      collectionId,
      currentUserId,
      dispatch,
      existingTrackIdSet,
      isDraft,
      queryClient
    ]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text')
      const { permalinks } = parseTrackUrls(pasted)
      // Only intercept the paste when the clipboard contains at least one
      // valid Audius track URL — otherwise let the user type/edit freely.
      if (permalinks.length === 0) return
      e.preventDefault()
      setUrlInput('')
      // addTracksFromText catches its own errors and toasts; the floating
      // promise is intentional. ESLint's no-void rule disallows the `void`
      // operator here, so we just let it float.
      addTracksFromText(pasted)
    },
    [addTracksFromText]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      const value = urlInput
      setUrlInput('')
      addTracksFromText(value)
    },
    [urlInput, addTracksFromText]
  )

  const queueEntries = useMemo<Queueable[]>(
    () =>
      suggestedTracks
        .filter((track): track is Track => !!track?.track_id)
        .map((track) => ({
          id: track.track_id,
          source: QueueSource.RECOMMENDED_TRACKS
        })),
    [suggestedTracks]
  )

  const contentHeight = 66 + SUGGESTED_TRACK_COUNT * 74
  const contentStyles = useSpring({
    height: isExpanded ? contentHeight : 0
  })

  return (
    <Paper column css={{ textAlign: 'left' }}>
      <div
        className={styles.heading}
        role='button'
        aria-expanded={isExpanded}
        aria-label={isExpanded ? messages.collapseLabel : messages.expandLabel}
        onClick={toggleIsExpanded}
      >
        <div className={styles.headingText}>
          <h4 className={styles.title}>{messages.title}</h4>
        </div>
        <IconCaretDown
          color='subdued'
          css={{
            transition: `transform ${motion.expressive}`,
            transform: isExpanded ? `rotate(180deg)` : undefined
          }}
        />
      </div>
      {/* Always-visible add-by-URL input. Sits outside the collapsible
          section so the user can paste a track URL without expanding the
          suggested-list panel. Replaces the previous IconLink button in
          OwnerActionButtons, which opened a separate AddTracksByUrlModal. */}
      <Flex ph='l' pb='m'>
        <TextInput
          label={messages.urlLabel}
          hideLabel
          placeholder={messages.urlPlaceholder}
          startIcon={IconLink}
          size={TextInputSize.SMALL}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={isAdding}
        />
      </Flex>
      <animated.div className={styles.content} style={contentStyles}>
        <ul>
          <Divider />
          {[...Array(SUGGESTED_TRACK_COUNT)].map((_, i) => (
            <li key={suggestedTracks[i]?.track_id ?? i}>
              {suggestedTracks[i] ? (
                <SuggestedTrackRow
                  track={suggestedTracks[i]}
                  collectionId={collectionId}
                  queueEntries={queueEntries}
                  onAddTrack={onAddTrack}
                />
              ) : (
                <SuggestedTrackSkeleton />
              )}
              <Divider />
            </li>
          ))}
        </ul>
        <button className={styles.refreshButton} onClick={onRefresh}>
          <div className={styles.refreshContent}>
            <IconRefresh className={styles.refreshIcon} />
            <span className={styles.refreshText}>{messages.refresh}</span>
          </div>
        </button>
      </animated.div>
    </Paper>
  )
}
