import { useCallback, useEffect, useMemo, useState, RefObject } from 'react'

import {
  useCurrentAccountUser,
  useUserByParams,
  useQueryContext,
  QUERY_KEYS
} from '@audius/common/api'
import { useCurrentTrack, useIsArtist } from '@audius/common/hooks'
import {
  Name,
  ShareSource,
  FollowSource,
  CreatePlaylistSource,
  Status,
  ID,
  UID
} from '@audius/common/models'
import { newUserMetadata } from '@audius/common/schemas'
import {
  accountActions,
  cacheCollectionsActions,
  profilePageFeedLineupActions as feedActions,
  profilePageTracksLineupActions as tracksActions,
  profilePageActions as profileActions,
  profilePageSelectors,
  CollectionSortMode,
  TracksSortMode,
  ProfilePageTabs,
  getTabForRoute,
  chatActions,
  chatSelectors,
  ChatPermissionAction,
  queueSelectors,
  usersSocialActions as socialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  inboxUnavailableModalActions,
  followingUserListActions,
  followersUserListActions,
  playerSelectors
} from '@audius/common/store'
import { getErrorMessage, Nullable, route } from '@audius/common/utils'
import { useQueryClient } from '@tanstack/react-query'
import moment from 'moment'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { make, TrackEvent } from 'common/store/analytics/actions'
import {
  openSignOn,
  showRequiresAccountToast
} from 'common/store/pages/signon/actions'
import { LineupVariant } from 'components/lineup/types'
import { ProfileMode } from 'components/stat-banner/StatBanner'
import { StatProps } from 'components/stats/Stats'
import * as unfollowConfirmationActions from 'components/unfollow-confirmation-modal/store/actions'
import { verifiedHandleWhitelist } from 'utils/handleWhitelist'
import { resizeImage } from 'utils/imageProcessingUtil'
import { push, replace } from 'utils/navigation'
import { getPathname } from 'utils/route'
import { parseUserRoute } from 'utils/route/userRouteParser'

const { NOT_FOUND_PAGE, profilePage: profilePageRoute } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { setFollowers } = followersUserListActions
const { setFollowing } = followingUserListActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { fetchHasTracks } = accountActions
const { createPlaylist } = cacheCollectionsActions

const { getProfileFeedLineup, getProfileTracksLineup } = profilePageSelectors
const { createChat } = chatActions
const { getBlockees, useCanCreateChat } = chatSelectors

export const useProfilePage = (containerRef: RefObject<HTMLDivElement>) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { env } = useQueryContext()
  const pathname = getPathname(location)
  const params = parseUserRoute(pathname)
  const handleLower = params?.handle?.toLowerCase() as string

  // Get user data from route params
  const { data: profile, status: profileStatus } = useUserByParams(
    params ?? {},
    {
      enabled: !!params
    }
  )
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      accountUserId: user?.user_id
    })
  })
  const accountUserId = accountData?.accountUserId
  const isArtist = useIsArtist({ id: profile?.user_id })
  const chatPermissions = useCanCreateChat(profile?.user_id)

  // Redux selectors
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const playing = useSelector(getPlaying)
  const buffering = useSelector(getBuffering)
  const artistTracks = useSelector((state: any) =>
    getProfileTracksLineup(state, handleLower)
  )
  const userFeed = useSelector((state: any) =>
    getProfileFeedLineup(state, handleLower)
  )
  const blockeeList = useSelector(getBlockees)
  const currentTrack = useCurrentTrack()

  // Local state
  const [activeTab, setActiveTab] = useState<ProfilePageTabs | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [shouldMaskContent, setShouldMaskContent] = useState(false)
  const [tracksLineupOrder, setTracksLineupOrder] = useState<TracksSortMode>(
    TracksSortMode.RECENT
  )
  const [areArtistRecommendationsVisible, setAreArtistRecommendationsVisible] =
    useState(false)
  const [showBlockUserConfirmationModal, setShowBlockUserConfirmationModal] =
    useState(false)
  const [
    showUnblockUserConfirmationModal,
    setShowUnblockUserConfirmationModal
  ] = useState(false)
  const [showMuteUserConfirmationModal, setShowMuteUserConfirmationModal] =
    useState(false)
  const [showUnmuteUserConfirmationModal, setShowUnmuteUserConfirmationModal] =
    useState(false)
  const [updatedName, setUpdatedName] = useState<string | null>(null)
  const [updatedCoverPhoto, setUpdatedCoverPhoto] = useState<any | null>(null)
  const [updatedProfilePicture, setUpdatedProfilePicture] = useState<
    any | null
  >(null)
  const [updatedBio, setUpdatedBio] = useState<string | null>(null)
  const [updatedLocation, setUpdatedLocation] = useState<string | null>(null)
  const [updatedTwitterHandle, setUpdatedTwitterHandle] = useState<
    string | null
  >(null)
  const [updatedInstagramHandle, setUpdatedInstagramHandle] = useState<
    string | null
  >(null)
  const [updatedTikTokHandle, setUpdatedTikTokHandle] = useState<string | null>(
    null
  )
  const [updatedWebsite, setUpdatedWebsite] = useState<string | null>(null)
  const [updatedArtistCoinBadge, setUpdatedArtistCoinBadge] = useState<
    Nullable<{
      mint: string
      logo_uri: string
      ticker: string
    }>
  >(null)

  // Effects
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(getTabForRoute(params.tab))
    }
  }, [params?.tab])

  useEffect(() => {
    if (profileStatus === 'error') {
      navigate(NOT_FOUND_PAGE)
    }
  }, [profileStatus, navigate])

  // Replace URL with properly formatted /handle route
  useEffect(() => {
    if (profile && profileStatus === 'success') {
      const currentParams = parseUserRoute(pathname)
      if (currentParams && currentParams.handle === null) {
        const newPath = profilePageRoute(profile.handle)
        const normalizePathname = (p: string) => {
          try {
            return decodeURIComponent(p)
          } catch {
            return p
          }
        }
        const normalizedPathname = normalizePathname(pathname)
        const normalizedNewPath = normalizePathname(newPath)
        if (normalizedNewPath !== normalizedPathname) {
          dispatch(replace(newPath))
        }
      }
    }
  }, [profile, profileStatus, pathname, dispatch])

  // Set default tab
  useEffect(() => {
    if (
      !activeTab &&
      profile &&
      artistTracks?.status === Status.SUCCESS &&
      accountUserId !== profile.user_id
    ) {
      if (isArtist) {
        setActiveTab(ProfilePageTabs.TRACKS)
      } else {
        setActiveTab(ProfilePageTabs.REPOSTS)
      }
    } else if (
      !activeTab &&
      profile &&
      !isArtist &&
      accountUserId !== profile.user_id
    ) {
      setActiveTab(ProfilePageTabs.REPOSTS)
    }
  }, [activeTab, profile, artistTracks?.status, isArtist, accountUserId])

  // Reset state when profile changes
  useEffect(() => {
    setActiveTab(null)
    setEditMode(false)
    setUpdatedName(null)
    setUpdatedCoverPhoto(null)
    setUpdatedProfilePicture(null)
    setUpdatedBio(null)
    setUpdatedLocation(null)
    setUpdatedTwitterHandle(null)
    setUpdatedInstagramHandle(null)
    setUpdatedTikTokHandle(null)
    setUpdatedWebsite(null)
    setUpdatedArtistCoinBadge(null)
    setAreArtistRecommendationsVisible(false)
  }, [profile?.handle])

  // Check if owner changed from visitor to owner
  useEffect(() => {
    if (profile && accountUserId === profile.user_id) {
      dispatch(fetchHasTracks())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id, accountUserId, dispatch])

  // Computed values
  const isOwner =
    profile && accountUserId ? profile.user_id === accountUserId : false
  const mode: ProfileMode = isOwner
    ? editMode
      ? 'editing'
      : 'owner'
    : 'visitor'

  const getStats = (isArtistValue: boolean): StatProps[] => {
    let trackCount = 0
    let playlistCount = 0
    let followerCount = 0
    let followingCount = 0

    if (profile) {
      trackCount = profile.track_count
      playlistCount = profile.playlist_count
      followerCount = profile.follower_count
      followingCount = profile.followee_count
    }

    return isArtistValue
      ? [
          {
            number: trackCount,
            title: trackCount === 1 ? 'track' : 'tracks',
            key: 'track'
          },
          {
            number: followerCount,
            title: followerCount === 1 ? 'follower' : 'followers',
            key: 'follower'
          },
          { number: followingCount, title: 'following', key: 'following' }
        ]
      : [
          {
            number: playlistCount,
            title: playlistCount === 1 ? 'playlist' : 'playlists',
            key: 'playlist'
          },
          {
            number: followerCount,
            title: followerCount === 1 ? 'follower' : 'followers',
            key: 'follower'
          },
          { number: followingCount, title: 'following', key: 'following' }
        ]
  }

  const stats = getStats(isArtist ?? false)

  const userId = profile ? profile.user_id : null
  const handle = profile ? `@${profile.handle}` : ''
  const verified = profile ? profile.is_verified : false
  const twitterVerified = !!profile?.verified_with_twitter
  const instagramVerified = !!profile?.verified_with_instagram
  const tikTokVerified = !!profile?.verified_with_tiktok
  const created = profile
    ? moment(profile.created_at).format('YYYY')
    : moment().format('YYYY')

  const name = profile ? (updatedName ?? profile.name ?? '') : ''
  const bio = profile && updatedBio !== null ? updatedBio : (profile?.bio ?? '')
  const profileLocation =
    profile && updatedLocation !== null
      ? updatedLocation
      : (profile?.location ?? '')
  const twitterHandle = profile
    ? updatedTwitterHandle !== null
      ? updatedTwitterHandle
      : twitterVerified && !verifiedHandleWhitelist.has(handle)
        ? profile.handle
        : (profile.twitter_handle ?? '')
    : ''
  const instagramHandle = profile
    ? updatedInstagramHandle !== null
      ? updatedInstagramHandle
      : instagramVerified
        ? profile.handle
        : (profile.instagram_handle ?? '')
    : ''
  const tikTokHandle = profile
    ? updatedTikTokHandle !== null
      ? updatedTikTokHandle
      : tikTokVerified
        ? profile.handle
        : (profile.tiktok_handle ?? '')
    : ''
  const website =
    profile && updatedWebsite !== null
      ? updatedWebsite
      : (profile?.website ?? '')

  // Determine artist coin badge
  let artistCoinBadge = null
  if (profile) {
    if (updatedArtistCoinBadge !== null) {
      artistCoinBadge = updatedArtistCoinBadge
    } else {
      if (profile.coin_flair_mint === '') {
        artistCoinBadge = {
          mint: '__none__',
          logo_uri: '',
          ticker: ''
        }
      } else if (profile.coin_flair_mint === null) {
        artistCoinBadge = {
          mint: '__default__',
          logo_uri: '',
          ticker: ''
        }
      } else {
        artistCoinBadge = profile.artist_coin_badge || null
      }
    }
  }

  const hasProfilePicture =
    profile &&
    (!!profile.profile_picture ||
      !!profile.profile_picture_sizes ||
      updatedProfilePicture)

  const dropdownDisabled = activeTab === ProfilePageTabs.REPOSTS
  const following = !!profile && profile.does_current_user_follow

  // Handlers
  const goToRoute = useCallback(
    (route: string) => dispatch(push(route)),
    [dispatch]
  )

  const onFollow = useCallback(() => {
    if (profile) {
      dispatch(
        socialActions.followUser(profile.user_id, FollowSource.PROFILE_PAGE)
      )
      setAreArtistRecommendationsVisible(true)
    }
  }, [profile, dispatch])

  const onUnfollow = useCallback(() => {
    if (profile) {
      dispatch(
        socialActions.unfollowUser(profile.user_id, FollowSource.PROFILE_PAGE)
      )
    }
  }, [profile, dispatch])

  const onShare = useCallback(() => {
    if (profile) {
      dispatch(
        requestOpenShareModal({
          type: 'profile',
          profileId: profile.user_id,
          source: ShareSource.PAGE
        })
      )
    }
  }, [profile, dispatch])

  const onConfirmUnfollow = useCallback(
    (userId: ID) => {
      dispatch(unfollowConfirmationActions.setOpen(userId))
    },
    [dispatch]
  )

  const changeTab = useCallback(
    (tab: ProfilePageTabs) => {
      setActiveTab(tab)
      const firstTab = isArtist ? 'Tracks' : 'Reposts'
      setTimeout(() => {
        setShouldMaskContent(tab !== firstTab)
      }, 300)
    },
    [isArtist]
  )

  const getLineupProps = useCallback(
    (lineup: any) => {
      const { uid: playingUid, source } = currentQueueItem
      return {
        lineup,
        variant: LineupVariant.CONDENSED,
        playingSource: source,
        playingTrackId: currentTrack?.track_id ?? null,
        playingUid,
        playing,
        buffering,
        scrollParent: containerRef.current || null
      }
    },
    [currentQueueItem, currentTrack, playing, buffering, containerRef]
  )

  const loadMoreArtistTracks = useCallback(
    (offset: number, limit: number) => {
      if (!profile) return
      dispatch(
        tracksActions.fetchLineupMetadatas(
          offset,
          limit,
          false,
          {
            userId: profile.user_id,
            sort: tracksLineupOrder
          },
          { handle: handleLower }
        )
      )
    },
    [profile, tracksLineupOrder, handleLower, dispatch]
  )

  const playArtistTrack = useCallback(
    (uid: string) => dispatch(tracksActions.play(uid)),
    [dispatch]
  )

  const pauseArtistTrack = useCallback(
    () => dispatch(tracksActions.pause()),
    [dispatch]
  )

  const loadMoreUserFeed = useCallback(
    (offset: number, limit: number) => {
      if (!profile) return
      dispatch(
        feedActions.fetchLineupMetadatas(
          offset,
          limit,
          false,
          { userId: profile.user_id },
          { handle: handleLower }
        )
      )
    },
    [profile, handleLower, dispatch]
  )

  const playUserFeedTrack = useCallback(
    (uid: UID) => dispatch(feedActions.play(uid)),
    [dispatch]
  )

  const pauseUserFeedTrack = useCallback(
    () => dispatch(feedActions.pause()),
    [dispatch]
  )

  const onSortByRecent = useCallback(() => {
    if (!profile) return
    setTracksLineupOrder(TracksSortMode.RECENT)
    dispatch(
      profileActions.updateCollectionSortMode(
        CollectionSortMode.TIMESTAMP,
        handleLower
      )
    )
    const trackEvent: TrackEvent = make(Name.PROFILE_PAGE_SORT, {
      sort: 'recent'
    })
    dispatch(trackEvent)
    loadMoreArtistTracks(0, artistTracks?.entries.length ?? 0)
  }, [
    profile,
    handleLower,
    dispatch,
    loadMoreArtistTracks,
    artistTracks?.entries.length
  ])

  const onSortByPopular = useCallback(() => {
    if (!profile) return
    setTracksLineupOrder(TracksSortMode.POPULAR)
    dispatch(
      profileActions.updateCollectionSortMode(
        CollectionSortMode.SAVE_COUNT,
        handleLower
      )
    )
    const trackEvent: TrackEvent = make(Name.PROFILE_PAGE_SORT, {
      sort: 'popular'
    })
    dispatch(trackEvent)
    loadMoreArtistTracks(0, artistTracks?.entries.length ?? 0)
  }, [
    profile,
    handleLower,
    dispatch,
    loadMoreArtistTracks,
    artistTracks?.entries.length
  ])

  const didChangeTabsFrom = useCallback(
    (prevLabel: string, currLabel: string) => {
      if (prevLabel !== currLabel) {
        const trackEvent: TrackEvent = make(Name.PROFILE_PAGE_TAB_CLICK, {
          tab: currLabel.toLowerCase() as
            | 'tracks'
            | 'albums'
            | 'reposts'
            | 'playlists'
        })
        dispatch(trackEvent)
      }
      if (profile) {
        let tab = `/${currLabel.toLowerCase()}`
        if (isArtist) {
          if (currLabel === ProfilePageTabs.TRACKS) {
            tab = ''
          }
        } else {
          if (currLabel === ProfilePageTabs.REPOSTS) {
            tab = ''
          }
        }
        window.history.replaceState({}, '', `/${profile.handle}${tab}`)
      }
      setActiveTab(currLabel as ProfilePageTabs)
    },
    [profile, isArtist, dispatch]
  )

  const onEdit = useCallback(() => {
    setEditMode(true)
    setUpdatedName(null)
    setUpdatedCoverPhoto(null)
    setUpdatedProfilePicture(null)
    setUpdatedBio(null)
    setUpdatedLocation(null)
    setUpdatedTwitterHandle(null)
    setUpdatedInstagramHandle(null)
    setUpdatedTikTokHandle(null)
    setUpdatedWebsite(null)
    setUpdatedArtistCoinBadge(null)
  }, [])

  const onCancel = useCallback(() => {
    setEditMode(false)
    setUpdatedName(null)
    setUpdatedCoverPhoto(null)
    setUpdatedProfilePicture(null)
    setUpdatedBio(null)
    setUpdatedLocation(null)
    setUpdatedArtistCoinBadge(null)
  }, [])

  const updateName = useCallback((name: string) => setUpdatedName(name), [])
  const updateBio = useCallback((bio: string) => setUpdatedBio(bio), [])
  const updateLocation = useCallback(
    (location: string) => setUpdatedLocation(location),
    []
  )
  const updateTwitterHandle = useCallback(
    (handle: string) => setUpdatedTwitterHandle(handle),
    []
  )
  const updateInstagramHandle = useCallback(
    (handle: string) => setUpdatedInstagramHandle(handle),
    []
  )
  const updateTikTokHandle = useCallback(
    (handle: string) => setUpdatedTikTokHandle(handle),
    []
  )
  const updateWebsite = useCallback(
    (website: string) => setUpdatedWebsite(website),
    []
  )

  const updateProfilePicture = useCallback(
    async (selectedFiles: any, source: 'original' | 'unsplash' | 'url') => {
      try {
        let file = selectedFiles[0]
        file = await resizeImage(file)
        const url = URL.createObjectURL(file)
        setUpdatedProfilePicture({ file, url, source })
      } catch (error) {
        setUpdatedProfilePicture({
          ...(updatedProfilePicture && updatedProfilePicture.url
            ? updatedProfilePicture
            : {}),
          error: getErrorMessage(error)
        } as any)
      }
    },
    [updatedProfilePicture]
  )

  const updateCoverPhoto = useCallback(
    async (selectedFiles: any, source: 'original' | 'unsplash' | 'url') => {
      try {
        let file = selectedFiles[0]
        file = await resizeImage(file, 2000, false)
        const url = URL.createObjectURL(file)
        setUpdatedCoverPhoto({ file, url, source })
      } catch (error) {
        setUpdatedCoverPhoto({
          ...(updatedCoverPhoto || {}),
          error: getErrorMessage(error)
        } as any)
      }
    },
    [updatedCoverPhoto]
  )

  const updateArtistCoinBadge = useCallback(
    async (
      badge: Nullable<{
        mint: string
        logo_uri: string
        ticker: string
      }>
    ) => {
      setUpdatedArtistCoinBadge(badge)

      // Optimistically update the user cache
      if (profile?.user_id && queryClient) {
        let optimisticBadge = badge
        if (badge?.mint === '__default__') {
          try {
            const userCoinsData = queryClient.getQueryData([
              'userCoins',
              { userId: profile.user_id }
            ]) as any

            if (userCoinsData) {
              const excludedMints = [
                env.WAUDIO_MINT_ADDRESS,
                env.USDC_MINT_ADDRESS
              ]

              const ownedCoin = userCoinsData.find(
                (coin: any) =>
                  coin.ownerId === profile.user_id &&
                  !excludedMints.includes(coin.mint)
              )

              const mostHeldCoin = userCoinsData.find(
                (coin: any) =>
                  coin.balance > 0 && !excludedMints.includes(coin.mint)
              )

              const firstEligibleCoin = ownedCoin ?? mostHeldCoin

              if (firstEligibleCoin) {
                optimisticBadge = {
                  mint: firstEligibleCoin.mint,
                  logo_uri: firstEligibleCoin.logoUri,
                  ticker: firstEligibleCoin.ticker
                }
              }
            }
          } catch (error) {
            console.error('Error computing default coin badge:', error)
          }
        }

        queryClient.setQueryData(
          [QUERY_KEYS.user, profile.user_id],
          (prevUser: any) => {
            if (!prevUser) return undefined

            let artistCoinBadge = null
            let coinFlairMint = null

            if (optimisticBadge) {
              if (optimisticBadge.mint === '__default__') {
                coinFlairMint = null
                artistCoinBadge = null
              } else if (optimisticBadge.mint === '__none__') {
                coinFlairMint = ''
                artistCoinBadge = null
              } else {
                coinFlairMint = optimisticBadge.mint
                artistCoinBadge = {
                  mint: optimisticBadge.mint,
                  logo_uri: optimisticBadge.logo_uri,
                  ticker: optimisticBadge.ticker
                }
              }
            }

            return {
              ...prevUser,
              coin_flair_mint: coinFlairMint,
              artist_coin_badge: artistCoinBadge
            }
          }
        )
      }
    },
    [profile, queryClient, env]
  )

  const updateProfile = useCallback(
    (metadata: any) => {
      dispatch(profileActions.updateProfile(metadata))
      setEditMode(false)
    },
    [dispatch]
  )

  const onSave = useCallback(() => {
    if (!profile) return

    const updatedMetadata = newUserMetadata({ ...profile })
    if (updatedCoverPhoto && (updatedCoverPhoto as any).file) {
      updatedMetadata.updatedCoverPhoto = updatedCoverPhoto
      const trackEvent: TrackEvent = make(
        Name.ACCOUNT_HEALTH_UPLOAD_COVER_PHOTO,
        { source: (updatedCoverPhoto as any).source }
      )
      dispatch(trackEvent)
    }
    if (updatedProfilePicture && (updatedProfilePicture as any).file) {
      updatedMetadata.updatedProfilePicture = updatedProfilePicture
      const trackEvent: TrackEvent = make(
        Name.ACCOUNT_HEALTH_UPLOAD_PROFILE_PICTURE,
        { source: (updatedProfilePicture as any).source }
      )
      dispatch(trackEvent)
    }
    if (updatedName) {
      updatedMetadata.name = updatedName
    }
    if (updatedBio !== null) {
      updatedMetadata.bio = updatedBio
    }
    if (updatedLocation !== null) {
      updatedMetadata.location = updatedLocation
    }
    if (updatedTwitterHandle !== null) {
      updatedMetadata.twitter_handle = updatedTwitterHandle
    }
    if (updatedInstagramHandle !== null) {
      updatedMetadata.instagram_handle = updatedInstagramHandle
    }
    if (updatedTikTokHandle !== null) {
      updatedMetadata.tiktok_handle = updatedTikTokHandle
    }
    if (updatedWebsite !== null) {
      updatedMetadata.website = updatedWebsite
    }

    let artistCoinBadgeValue = null
    if (updatedArtistCoinBadge !== null) {
      artistCoinBadgeValue = updatedArtistCoinBadge
    } else {
      if (profile.coin_flair_mint === '') {
        artistCoinBadgeValue = {
          mint: '__none__',
          logo_uri: '',
          ticker: ''
        }
      } else if (profile.coin_flair_mint === null) {
        artistCoinBadgeValue = {
          mint: '__default__',
          logo_uri: '',
          ticker: ''
        }
      } else {
        artistCoinBadgeValue = profile.artist_coin_badge || null
      }
    }

    if (artistCoinBadgeValue) {
      if (artistCoinBadgeValue.mint === '__default__') {
        updatedMetadata.coin_flair_mint = null
      } else if (artistCoinBadgeValue.mint === '__none__') {
        updatedMetadata.coin_flair_mint = ''
      } else {
        updatedMetadata.coin_flair_mint = artistCoinBadgeValue.mint
      }
    } else {
      updatedMetadata.coin_flair_mint = null
    }

    updateProfile(updatedMetadata)
  }, [
    profile,
    updatedCoverPhoto,
    updatedProfilePicture,
    updatedName,
    updatedBio,
    updatedLocation,
    updatedTwitterHandle,
    updatedInstagramHandle,
    updatedTikTokHandle,
    updatedWebsite,
    updatedArtistCoinBadge,
    updateProfile,
    dispatch
  ])

  const refreshProfile = useCallback(() => {
    // Profile will refetch automatically via useUserByParams when params change
    // This is a placeholder for any additional refresh logic
  }, [])

  const setFollowingUserId = useCallback(
    (userId: ID) => dispatch(setFollowing(userId)),
    [dispatch]
  )

  const setFollowersUserId = useCallback(
    (userId: ID) => dispatch(setFollowers(userId)),
    [dispatch]
  )

  const clickOverflow = useCallback(
    (userId: ID, overflowActions: OverflowAction[]) =>
      dispatch(
        open({ source: OverflowSource.PROFILE, id: userId, overflowActions })
      ),
    [dispatch]
  )

  const onMessage = useCallback(() => {
    if (!profile) return
    if (chatPermissions?.callToAction === ChatPermissionAction.SIGN_UP) {
      dispatch(openSignOn())
      dispatch(showRequiresAccountToast())
      return
    }
    if (chatPermissions?.canCreateChat) {
      dispatch(createChat({ userIds: [profile.user_id] }))
      dispatch(make(Name.CHAT_ENTRY_POINT, { source: 'profile' }))
    } else {
      dispatch(inboxUnavailableModalActions.open({ userId: profile.user_id }))
    }
  }, [profile, chatPermissions, dispatch])

  const onBlock = useCallback(() => {
    setShowBlockUserConfirmationModal(true)
  }, [])

  const onUnblock = useCallback(() => {
    setShowUnblockUserConfirmationModal(true)
  }, [])

  const onMute = useCallback(() => {
    setShowMuteUserConfirmationModal(true)
  }, [])

  const onCloseBlockUserConfirmationModal = useCallback(() => {
    setShowBlockUserConfirmationModal(false)
  }, [])

  const onCloseUnblockUserConfirmationModal = useCallback(() => {
    setShowUnblockUserConfirmationModal(false)
  }, [])

  const onCloseMuteUserConfirmationModal = useCallback(() => {
    setShowMuteUserConfirmationModal(false)
  }, [])

  const onCloseUnmuteUserConfirmationModal = useCallback(() => {
    setShowUnmuteUserConfirmationModal(false)
  }, [])

  const onCloseArtistRecommendations = useCallback(() => {
    setAreArtistRecommendationsVisible(false)
  }, [])

  const createPlaylistCallback = useCallback(
    () =>
      dispatch(
        createPlaylist(
          { playlist_name: 'Create Playlist' },
          CreatePlaylistSource.PROFILE_PAGE
        )
      ),
    [dispatch]
  )

  const hasMadeEdit =
    updatedName !== null ||
    updatedBio !== null ||
    updatedLocation !== null ||
    updatedTwitterHandle !== null ||
    updatedInstagramHandle !== null ||
    updatedTikTokHandle !== null ||
    updatedWebsite !== null ||
    updatedArtistCoinBadge !== null ||
    updatedCoverPhoto !== null ||
    updatedProfilePicture !== null

  const isBlocked = profile ? blockeeList.includes(profile.user_id) : false

  const canCreateChat =
    chatPermissions?.canCreateChat ||
    chatPermissions?.callToAction === ChatPermissionAction.SIGN_UP

  return {
    // Profile data
    profile,
    status:
      profileStatus === 'success'
        ? Status.SUCCESS
        : profileStatus === 'error'
          ? Status.ERROR
          : Status.LOADING,
    accountUserId,
    isArtist: isArtist ?? false,
    isOwner,
    userId,
    handle,
    verified,
    created,
    name,
    bio,
    location: profileLocation,
    twitterHandle,
    instagramHandle,
    tikTokHandle,
    twitterVerified,
    instagramVerified,
    tikTokVerified,
    website,
    artistCoinBadge,
    hasProfilePicture: !!hasProfilePicture,
    following,
    mode,
    stats,
    activeTab,
    dropdownDisabled,
    profilePictureSizes: profile?.profile_picture ?? null,
    updatedCoverPhoto: updatedCoverPhoto
      ? {
          error: !!(updatedCoverPhoto as any).error,
          url: (updatedCoverPhoto as any).url || ''
        }
      : { error: false, url: '' },
    updatedProfilePicture: updatedProfilePicture
      ? {
          error: !!(updatedProfilePicture as any).error,
          url: (updatedProfilePicture as any).url || ''
        }
      : { error: false, url: '' },

    // Lineups
    artistTracks: artistTracks ?? {
      entries: [],
      status: Status.LOADING,
      hasMore: false
    },
    userFeed: userFeed ?? {
      entries: [],
      status: Status.LOADING,
      hasMore: false
    },

    // State
    editMode,
    shouldMaskContent,
    areArtistRecommendationsVisible,
    showBlockUserConfirmationModal,
    showUnblockUserConfirmationModal,
    showMuteUserConfirmationModal,
    showUnmuteUserConfirmationModal,
    hasMadeEdit,
    isBlocked,
    canCreateChat,

    // Handlers
    goToRoute,
    changeTab,
    getLineupProps,
    onSortByRecent,
    onSortByPopular,
    loadMoreArtistTracks,
    loadMoreUserFeed,
    playArtistTrack,
    pauseArtistTrack,
    playUserFeedTrack,
    pauseUserFeedTrack,
    refreshProfile,
    setFollowingUserId,
    setFollowersUserId,
    onFollow,
    onUnfollow,
    onShare,
    onEdit,
    onSave,
    onCancel,
    updateProfilePicture,
    updateName,
    updateBio,
    updateLocation,
    updateTwitterHandle,
    updateInstagramHandle,
    updateTikTokHandle,
    updateWebsite,
    updateArtistCoinBadge,
    updateCoverPhoto,
    updateProfile,
    didChangeTabsFrom,
    onMessage,
    onBlock,
    onUnblock,
    onMute,
    onConfirmUnfollow,
    onCloseArtistRecommendations,
    onCloseBlockUserConfirmationModal,
    onCloseUnblockUserConfirmationModal,
    onCloseMuteUserConfirmationModal,
    onCloseUnmuteUserConfirmationModal,
    clickOverflow,
    createPlaylist: createPlaylistCallback,
    currentQueueItem,
    trackIsActive: !!currentQueueItem
  }
}
