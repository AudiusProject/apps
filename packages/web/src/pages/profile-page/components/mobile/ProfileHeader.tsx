import { useState, useRef, useCallback, useEffect, MouseEvent } from 'react'

import { useArtistOwnedCoin } from '@audius/common/api'
import {
  imageCoverPhotoBlank,
  imageProfilePicEmpty
} from '@audius/common/assets'
import {
  Name,
  SquareSizes,
  WidthSizes,
  ID,
  ProfilePictureSizes,
  CoverPhotoSizes,
  User
} from '@audius/common/models'
import { formatCount, route } from '@audius/common/utils'
import {
  IconArtistBadge as BadgeArtist,
  IconInstagram,
  IconDonate,
  IconLink,
  IconTikTok,
  IconX,
  Flex,
  Button,
  IconPencil,
  FollowButton,
  Text
} from '@audius/harmony'
import cn from 'classnames'

import { make, useRecord } from 'common/store/analytics/actions'
import { ArtistRecommendationsDropdown } from 'components/artist-recommendations/ArtistRecommendationsDropdown'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import Skeleton from 'components/skeleton/Skeleton'
import SubscribeButton from 'components/subscribe-button/SubscribeButton'
import { TipAudioButton } from 'components/tipping/tip-audio/TipAudioButton'
import FollowsYouBadge from 'components/user-badges/FollowsYouBadge'
import ProfilePageBadge from 'components/user-badges/ProfilePageBadge'
import UserBadges from 'components/user-badges/UserBadges'
import { UserGeneratedText } from 'components/user-generated-text'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useProfilePicture } from 'hooks/useProfilePicture'

import { BuyArtistCoinButton } from './BuyArtistCoinButton'
import GrowingCoverPhoto from './GrowingCoverPhoto'
import styles from './ProfileHeader.module.css'
import { SocialLink } from './SocialLink'
import UploadButton from './UploadButton'
import UploadStub from './UploadStub'

const { FOLLOWING_USERS_ROUTE, FOLLOWERS_USERS_ROUTE } = route

const messages = {
  tracks: 'Tracks',
  followers: 'Followers',
  following: 'Following',
  playlists: 'Playlists',
  showMore: 'Show More',
  showLess: 'Show Less',
  editProfile: 'Edit Profile',
  profilePicAltText: 'User Profile Picture'
}

const LoadingProfileHeader = () => {
  return (
    <div className={styles.headerContainer}>
      <div className={cn(styles.coverPhoto, styles.loading)}>
        <Skeleton
          className={cn(styles.loadingSkeleton, styles.loadingSkeletonAvatar)}
        />
      </div>
      <div className={cn(styles.artistInfo, styles.loadingInfo)}>
        <div className={styles.loadingNameContainer}>
          <Skeleton
            className={cn(styles.loadingSkeleton, styles.loadingShortName)}
          />
        </div>
        <Skeleton className={cn(styles.loadingSkeleton)} />
        <Skeleton
          className={cn(styles.loadingSkeleton, styles.loadingShortDesc)}
        />
      </div>
    </div>
  )
}

type ProfileHeaderProps = {
  isDeactivated: boolean
  profile: User
  name: string
  handle: string
  isArtist: boolean
  bio: string
  verified: boolean
  userId: ID
  loading: boolean
  coverPhotoSizes: CoverPhotoSizes | null
  profilePictureSizes: ProfilePictureSizes | null
  hasProfilePicture: boolean
  playlistCount: number
  trackCount: number
  followerCount: number
  setFollowersUserId: (id: ID) => void
  followingCount: number
  setFollowingUserId: (id: ID) => void
  xHandle: string
  instagramHandle: string
  tikTokHandle: string
  website: string
  donation: string
  followers: any
  goToRoute: (route: string) => void
  following: boolean
  mode: string
  onFollow: (id: ID) => void
  onUnfollow: (id: ID) => void
  switchToEditMode: () => void
  updatedCoverPhoto: string | null
  updatedProfilePicture: string | null
  onUpdateProfilePicture: (
    files: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  onUpdateCoverPhoto: (
    files: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  areArtistRecommendationsVisible: boolean
  onCloseArtistRecommendations: () => void
}

function isEllipsisActive(e: HTMLElement) {
  return e.offsetHeight < e.scrollHeight
}

const ProfileHeader = ({
  isDeactivated,
  profile,
  name,
  handle,
  isArtist,
  bio,
  userId,
  loading,
  profilePictureSizes,
  playlistCount,
  trackCount,
  followerCount,
  followingCount,
  xHandle,
  instagramHandle,
  tikTokHandle,
  website,
  donation,
  setFollowersUserId,
  setFollowingUserId,
  goToRoute,
  following,
  mode,
  onFollow,
  onUnfollow,
  switchToEditMode,
  updatedCoverPhoto,
  updatedProfilePicture,
  onUpdateCoverPhoto,
  onUpdateProfilePicture,
  areArtistRecommendationsVisible,
  onCloseArtistRecommendations
}: ProfileHeaderProps) => {
  const [hasEllipsis, setHasEllipsis] = useState(false)
  const [isDescriptionMinimized, setIsDescriptionMinimized] = useState(true)
  const bioRef = useRef<HTMLElement | null>(null)
  const isEditing = mode === 'editing'

  const bioRefCb = useCallback((node: HTMLParagraphElement) => {
    if (node !== null) {
      const ellipsisActive = isEllipsisActive(node)
      if (ellipsisActive) {
        bioRef.current = node
        setHasEllipsis(true)
        node.style.height = '40px'
      }
    }
  }, [])

  useEffect(() => {
    const bioEl = bioRef.current
    if (bioEl && hasEllipsis) {
      if (isDescriptionMinimized) {
        bioEl.style.height = '40px'
      } else {
        bioEl.style.height = `${bioEl.scrollHeight}px`
      }
    }
  }, [hasEllipsis, isDescriptionMinimized])

  useEffect(() => {
    if ((website || donation) && !hasEllipsis) {
      setHasEllipsis(true)
    }
  }, [website, donation, hasEllipsis, setHasEllipsis])

  let { image: coverPhoto } = useCoverPhoto({
    userId,
    size: WidthSizes.SIZE_2000
  })
  coverPhoto = isDeactivated ? imageProfilePicEmpty : coverPhoto
  let coverPhotoStyle = {}
  if (coverPhoto === imageCoverPhotoBlank) {
    coverPhotoStyle = {
      backgroundRepeat: 'repeat',
      backgroundSize: '300px 300px'
    }
  }
  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })

  // Artist coin detection
  const { data: artistCoin, isPending: isArtistCoinLoading } =
    useArtistOwnedCoin(userId)

  const record = useRecord()

  const onGoToInstagram = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_INSTAGRAM, {
        handle: handle.replace('@', ''),
        instagramHandle
      })
    )
  }, [record, instagramHandle, handle])

  const onGoToX = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TWITTER, {
        handle: handle.replace('@', ''),
        twitterHandle: xHandle
      })
    )
  }, [record, xHandle, handle])

  const onGoToTikTok = useCallback(() => {
    record(
      make(Name.PROFILE_PAGE_CLICK_TIKTOK, {
        handle: handle.replace('@', ''),
        tikTokHandle
      })
    )
  }, [record, tikTokHandle, handle])

  const onGoToFollowersPage = () => {
    setFollowersUserId(userId)
    goToRoute(FOLLOWERS_USERS_ROUTE)
  }

  const onGoToFollowingPage = () => {
    setFollowingUserId(userId)
    goToRoute(FOLLOWING_USERS_ROUTE)
  }

  const onGoToWebsite = () => {
    let link = website
    if (!/^https?/.test(link)) {
      link = `https://${link}`
    }
    const win = window.open(link, '_blank')
    if (win) win.focus()
    record(
      make(Name.PROFILE_PAGE_CLICK_WEBSITE, {
        handle,
        website
      })
    )
  }

  const handleClickDonationLink = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      record(
        make(Name.PROFILE_PAGE_CLICK_DONATION, {
          handle,
          // @ts-expect-error
          donation: event.target.href
        })
      )
    },
    [record, handle]
  )

  // If we're not loading, we know that
  // nullable fields such as userId are valid.
  if (loading) {
    return <LoadingProfileHeader />
  }

  return (
    <div className={styles.headerContainer}>
      <GrowingCoverPhoto
        image={updatedCoverPhoto || coverPhoto}
        imageStyle={coverPhotoStyle}
        wrapperClassName={cn(styles.coverPhoto, {
          [styles.isEditing]: isEditing
        })}
        useBlur={Boolean(
          !profile?.cover_photo_sizes && profile?.profile_picture_sizes
        )}
      >
        {isArtist && !isEditing && !isDeactivated ? (
          <BadgeArtist className={styles.badgeArtist} />
        ) : null}
        {isEditing && <UploadStub onChange={onUpdateCoverPhoto} />}
      </GrowingCoverPhoto>
      <DynamicImage
        image={updatedProfilePicture || profilePicture}
        alt={messages.profilePicAltText}
        className={styles.profilePicture}
        wrapperClassName={cn(styles.profilePictureWrapper, {
          [styles.isEditing]: isEditing
        })}
      >
        {isEditing && <UploadStub onChange={onUpdateProfilePicture} />}
      </DynamicImage>
      {!isEditing && !isDeactivated && (
        <div className={styles.artistInfo}>
          <div className={styles.titleContainer}>
            <div className={styles.left}>
              <div className={styles.artistName}>
                <h1>
                  {`${name} `}
                  <span className={styles.badgesSpan}>
                    <UserBadges
                      userId={userId}
                      className={styles.iconVerified}
                      size='2xs'
                    />
                  </span>
                </h1>
              </div>
              <div className={styles.artistHandleWrapper}>
                <div className={styles.artistHandle}>{handle}</div>
                <FollowsYouBadge variant='flat' userId={userId} />
              </div>
            </div>

            <Flex gap='s' justifyContent='flex-end' flex={1}>
              {following ? <SubscribeButton userId={userId} /> : null}
              {mode === 'owner' ? (
                <Button
                  variant='secondary'
                  size='small'
                  onClick={switchToEditMode}
                  iconLeft={IconPencil}
                >
                  {messages.editProfile}
                </Button>
              ) : (
                <FollowButton
                  isFollowing={following}
                  onFollow={() => onFollow(userId)}
                  onUnfollow={() => onUnfollow(userId)}
                  fullWidth={false}
                />
              )}
            </Flex>
          </div>
          <div className={styles.artistMetrics}>
            <div className={styles.artistMetric}>
              <div className={styles.artistMetricValue}>
                {formatCount(isArtist ? trackCount : playlistCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {isArtist ? messages.tracks : messages.playlists}
              </div>
            </div>
            <div
              className={styles.artistMetric}
              onClick={followerCount! > 0 ? onGoToFollowersPage : () => {}}
            >
              <div className={styles.artistMetricValue}>
                {formatCount(followerCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {messages.followers}
              </div>
            </div>
            <div
              className={styles.artistMetric}
              onClick={followingCount! > 0 ? onGoToFollowingPage : () => {}}
            >
              <div className={styles.artistMetricValue}>
                {formatCount(followingCount)}
              </div>
              <div className={styles.artistMetricLabel}>
                {messages.following}
              </div>
            </div>
          </div>
          <Flex alignItems='center' gap='m'>
            <ProfilePageBadge userId={userId} isCompact />
            <Flex gap='xl' justifyContent='center' flex={1}>
              {xHandle ? (
                <SocialLink
                  to={`https://x.com/${xHandle}`}
                  onClick={onGoToX}
                  icon={<IconX size='xl' />}
                />
              ) : null}
              {instagramHandle ? (
                <SocialLink
                  to={`https://instagram.com/${instagramHandle}`}
                  onClick={onGoToInstagram}
                  icon={<IconInstagram size='xl' />}
                />
              ) : null}
              {tikTokHandle ? (
                <SocialLink
                  to={`https://tiktok.com/@${tikTokHandle}`}
                  onClick={onGoToTikTok}
                  icon={<IconTikTok />}
                />
              ) : null}
            </Flex>
          </Flex>

          {bio ? (
            <UserGeneratedText
              ref={bioRefCb}
              color='subdued'
              size='s'
              linkSource='profile page'
              className={cn(styles.bio, {
                [styles.bioExpanded]: hasEllipsis && !isDescriptionMinimized
              })}
            >
              {bio}
            </UserGeneratedText>
          ) : null}
          {hasEllipsis && !isDescriptionMinimized && (website || donation) && (
            <div className={styles.sites}>
              {website && (
                <div className={styles.website} onClick={onGoToWebsite}>
                  <IconLink size='m' color='default' />
                  <span>{website}</span>
                </div>
              )}
              {donation && (
                <div className={styles.donation}>
                  <IconDonate size='m' color='default' />
                  <UserGeneratedText
                    size='s'
                    onClickLink={handleClickDonationLink}
                  >
                    {donation}
                  </UserGeneratedText>
                </div>
              )}
            </div>
          )}
          {hasEllipsis ? (
            <div
              className={styles.expandDescription}
              onClick={() => setIsDescriptionMinimized(!isDescriptionMinimized)}
            >
              {isDescriptionMinimized ? messages.showMore : messages.showLess}
            </div>
          ) : null}

          <ArtistRecommendationsDropdown
            isVisible={areArtistRecommendationsVisible}
            renderHeader={() => (
              <Flex ml='m'>
                <Text>Here are some accounts that vibe well with {name}</Text>
              </Flex>
            )}
            artistId={userId}
            onClose={onCloseArtistRecommendations}
          />

          {/* Artist coin buy button or tip button */}
          {mode !== 'owner' &&
            !isArtistCoinLoading &&
            (artistCoin?.mint ? (
              <BuyArtistCoinButton userId={userId} />
            ) : (
              <TipAudioButton />
            ))}
        </div>
      )}
      {mode === 'owner' && !isEditing && <UploadButton />}
    </div>
  )
}

export default ProfileHeader
