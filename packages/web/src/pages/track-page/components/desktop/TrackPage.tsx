import { useCallback, useRef } from 'react'

import { useToggleFavoriteTrack } from '@audius/common/api'
import { useFeatureFlag, useGatedContentAccess } from '@audius/common/hooks'
import { ID, Track, User, FavoriteSource } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { Box, Flex } from '@audius/harmony'

import { CommentSection } from 'components/comments/CommentSection'
import CoverPhoto from 'components/cover-photo/CoverPhoto'
import { EmptyNavBanner } from 'components/nav-banner/NavBanner'
import { FlushPageContainer } from 'components/page/FlushPageContainer'
import Page from 'components/page/Page'
import { EmptyStatBanner } from 'components/stat-banner/StatBanner'
import { GiantTrackTile } from 'components/track/GiantTrackTile'
import { RemixContestCountdown } from 'components/track/RemixContestCountdown'
import { getTrackDefaults, emptyStringGuard } from 'pages/track-page/utils'

import { TrackPageLineup } from '../TrackPageLineup'
import { useTrackPageSize } from '../useTrackPageSize'

export type OwnProps = {
  title: string
  description: string
  canonicalUrl: string
  structuredData?: Object
  // Hero Track Props
  heroTrack: Track | null
  user: User | null
  heroPlaying: boolean
  previewing: boolean
  userId: ID | null
  onHeroPlay: ({
    isPlaying,
    isPreview
  }: {
    isPlaying: boolean
    isPreview?: boolean
  }) => void
  onHeroShare: (trackId: ID) => void
  onHeroRepost: (isReposted: boolean, trackId: ID) => void
  onFollow: () => void
  onUnfollow: () => void

  makePublic: (trackId: ID) => void
}

const TrackPage = ({
  title,
  description,
  canonicalUrl,
  structuredData,
  // Hero Track Props
  heroTrack,
  user,
  heroPlaying,
  previewing,
  userId,
  onHeroPlay,
  onHeroShare,
  onHeroRepost,
  onFollow,
  onUnfollow,
  makePublic
}: OwnProps) => {
  const { isDesktop } = useTrackPageSize()
  const isOwner = heroTrack?.owner_id === userId
  const following = user?.does_current_user_follow ?? false
  const isSaved = heroTrack?.has_current_user_saved ?? false
  const isReposted = heroTrack?.has_current_user_reposted ?? false

  const { isFetchingNFTAccess, hasStreamAccess } =
    useGatedContentAccess(heroTrack)

  const { isEnabled: commentsFlagEnabled } = useFeatureFlag(
    FeatureFlags.COMMENTS_ENABLED
  )
  const isCommentingEnabled =
    commentsFlagEnabled && !heroTrack?.comments_disabled
  const loading = !heroTrack || isFetchingNFTAccess

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: heroTrack?.track_id,
    source: FavoriteSource.TRACK_PAGE
  })

  const onPlay = () => onHeroPlay({ isPlaying: heroPlaying })
  const onPreview = () =>
    onHeroPlay({ isPlaying: heroPlaying, isPreview: true })

  const onShare = () => (heroTrack ? onHeroShare(heroTrack.track_id) : null)
  const onRepost = () =>
    heroTrack ? onHeroRepost(isReposted, heroTrack.track_id) : null

  const commentSectionRef = useRef<HTMLDivElement | null>(null)

  const defaults = getTrackDefaults(heroTrack)

  const scrollToCommentSection = useCallback(() => {
    if (commentSectionRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [commentSectionRef])

  const renderGiantTrackTile = () => (
    <GiantTrackTile
      loading={loading}
      playing={heroPlaying}
      previewing={previewing}
      trackTitle={defaults.title}
      trackId={defaults.trackId}
      aiAttributionUserId={defaults.aiAttributionUserId}
      userId={user?.user_id ?? 0}
      artistHandle={emptyStringGuard(user?.handle)}
      tags={defaults.tags}
      description={defaults.description}
      listenCount={defaults.playCount}
      duration={defaults.duration}
      releaseDate={defaults.releaseDate}
      credits={defaults.credits}
      genre={defaults.genre}
      mood={defaults.mood}
      repostCount={defaults.repostCount}
      saveCount={defaults.saveCount}
      isReposted={isReposted}
      isOwner={isOwner}
      currentUserId={userId}
      isArtistPick={
        heroTrack && user
          ? user.artist_pick_track_id === heroTrack.track_id
          : false
      }
      ddexApp={heroTrack?.ddex_app}
      isSaved={isSaved}
      isUnlisted={defaults.isUnlisted}
      isScheduledRelease={defaults.isScheduledRelease}
      isStreamGated={defaults.isStreamGated}
      streamConditions={defaults.streamConditions}
      isDownloadGated={defaults.isDownloadGated}
      downloadConditions={defaults.downloadConditions}
      hasStreamAccess={hasStreamAccess}
      isRemix={!!defaults.remixParentTrackId}
      isPublishing={defaults.isPublishing}
      fieldVisibility={defaults.fieldVisibility}
      coSign={defaults.coSign}
      scrollToCommentSection={scrollToCommentSection}
      // Actions
      onPlay={onPlay}
      onPreview={onPreview}
      onShare={onShare}
      onRepost={onRepost}
      onSave={toggleSaveTrack}
      following={following}
      onFollow={onFollow}
      onUnfollow={onUnfollow}
      onMakePublic={makePublic}
    />
  )

  return (
    <Page
      title={title}
      description={description}
      ogDescription={defaults.description}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      variant='flush'
      scrollableSearch
      fromOpacity={1}
      noIndex={defaults.isUnlisted}
    >
      <Box w='100%' css={{ position: 'absolute', height: '376px' }}>
        <RemixContestCountdown trackId={heroTrack?.track_id ?? 0} />
        <CoverPhoto loading={loading} userId={user ? user.user_id : null} />
        <EmptyStatBanner />
        <EmptyNavBanner />
      </Box>
      <FlushPageContainer>
        <Flex
          direction='column'
          w='100%'
          pt={200}
          pb={60}
          css={{ position: 'relative' }}
        >
          {renderGiantTrackTile()}
          <Flex
            gap='2xl'
            w='100%'
            direction={isDesktop ? 'row' : 'column'}
            mt='3xl'
            mh='auto'
            css={{ maxWidth: 1080 }}
            justifyContent='center'
          >
            {isCommentingEnabled ? (
              <Flex flex='3'>
                <CommentSection
                  entityId={defaults.trackId}
                  commentSectionRef={commentSectionRef}
                />
              </Flex>
            ) : null}
            <TrackPageLineup
              user={user}
              trackId={heroTrack?.track_id}
              commentsDisabled={heroTrack?.comments_disabled}
            />
          </Flex>
        </Flex>
      </FlushPageContainer>
    </Page>
  )
}

export default TrackPage
