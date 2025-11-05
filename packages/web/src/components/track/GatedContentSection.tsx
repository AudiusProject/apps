import { useCallback, useEffect } from 'react'

import { useArtistCoin, useUsers } from '@audius/common/api'
import {
  Name,
  FollowSource,
  ModalSource,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated,
  ID,
  AccessConditions,
  User,
  isContentTokenGated
} from '@audius/common/models'
import {
  usersSocialActions as socialActions,
  tippingActions,
  usePremiumContentPurchaseModal,
  gatedContentSelectors,
  PurchaseableContentType,
  useBuySellModal
} from '@audius/common/store'
import { removeNullable, Nullable, route } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import {
  Flex,
  Text,
  IconCart,
  IconSparkles,
  Button,
  IconUserFollow,
  IconTipping,
  IconArtistCoin
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom-v5-compat'

import { useModalState } from 'common/hooks/useModalState'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TextLink, UserLink } from 'components/link'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { make, track } from 'services/analytics'

import { LockedStatusBadge } from '../locked-status-badge'

import styles from './GiantTrackTile.module.css'

const { beginTip } = tippingActions
const { getGatedContentStatusMap } = gatedContentSelectors

const BUY_BUTTON_WIDTH = 250

const getMessages = (contentType: PurchaseableContentType) => ({
  howToUnlock: 'how to unlock',
  payToUnlock: 'pay to unlock',
  purchasing: 'purchasing',
  unlocking: 'unlocking',
  unlocked: 'unlocked',
  coinGated: 'COIN GATED',
  specialAccess: 'SPECIAL ACCESS',
  sendTip: 'Send Tip',
  followArtist: 'Follow Artist',
  buyArtistCoin: 'Buy Artist Coin',
  period: '.',
  exclamationMark: '!',
  ownFollowGated: 'Users can unlock access by following your account!',
  unlockFollowGatedContentPrefix: 'Follow',
  thankYouForFollowing: 'Thank you for following',
  unlockedFollowGatedContentSuffix: `! This ${contentType} is now available.`,
  ownTipGated: 'Users can unlock access by sending you a tip!',
  unlockTipGatedContentPrefix: 'Send',
  unlockTipGatedContentSuffix: 'a tip.',
  thankYouForSupporting: 'Thank you for supporting',
  unlockingTipGatedContentSuffix: 'by sending them a tip!',
  unlockedTipGatedContentSuffix: `by sending them a tip! This ${contentType} is now available.`,
  unlockWithPurchase: `Unlock this ${contentType} with a one-time purchase!`,
  ofArtistsCoin: "of the artist's coin",
  artistCoin: 'Artist coin',
  unlockTokenGatedContentPrefix: (amount: number) =>
    `You must hold at least ${amount} `,
  unlockTokenGatedContentSuffix: ' in a connected wallet.',
  unlockedTokenGatedSuffix: ` was found in a linked wallet. This ${contentType} is now available.`,
  ownTokenGated:
    'Fans can unlock access by linking a wallet containing your artist coin',
  purchased: `You've purchased this ${contentType}.`,
  buy: (price: string) => `Buy ${price}`,
  usersCanPurchase: (price: string) =>
    `Users can unlock access to this ${contentType} for a one time purchase of ${price}`
})

type GatedContentAccessSectionProps = {
  contentId: ID
  contentType: PurchaseableContentType
  trackOwner: Nullable<User>
  streamConditions: AccessConditions
  followee: Nullable<User>
  tippedUser: Nullable<User>
  isOwner: boolean
  className?: string
  buttonClassName?: string
  source?: ModalSource
}

const LockedGatedContentSection = ({
  contentId,
  contentType,
  streamConditions,
  followee,
  tippedUser,
  className,
  buttonClassName,
  source
}: GatedContentAccessSectionProps) => {
  const messages = getMessages(contentType)
  const dispatch = useDispatch()
  const [lockedContentModalVisibility, setLockedContentModalVisibility] =
    useModalState('LockedContent')
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const { data: coin } = useArtistCoin(
    isContentTokenGated(streamConditions)
      ? streamConditions.token_gate.token_mint
      : ''
  )
  const tipSource = lockedContentModalVisibility
    ? 'howToUnlockModal'
    : 'howToUnlockTrackPage'
  const followSource = lockedContentModalVisibility
    ? FollowSource.HOW_TO_UNLOCK_MODAL
    : FollowSource.HOW_TO_UNLOCK_TRACK_PAGE
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)
  const [searchParams] = useSearchParams()
  const openCheckout = searchParams.get('checkout') === 'true'

  const handlePurchase = useRequiresAccountCallback(() => {
    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
    openPremiumContentPurchaseModal(
      { contentId, contentType },
      { source: source ?? ModalSource.TrackDetails }
    )
  }, [
    contentId,
    contentType,
    lockedContentModalVisibility,
    openPremiumContentPurchaseModal,
    setLockedContentModalVisibility,
    source
  ])

  const handlePurchaseViaGuestCheckout = useCallback(() => {
    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
    openPremiumContentPurchaseModal(
      { contentId, contentType },
      { source: source ?? ModalSource.TrackDetails }
    )
  }, [
    contentId,
    contentType,
    lockedContentModalVisibility,
    openPremiumContentPurchaseModal,
    setLockedContentModalVisibility,
    source
  ])

  useEffect(() => {
    if (openCheckout && isUSDCPurchaseGated) {
      handlePurchaseViaGuestCheckout()
    }
  }, [
    openCheckout,
    handlePurchase,
    isUSDCPurchaseGated,
    handlePurchaseViaGuestCheckout
  ])

  const { onOpen: openBuySellModal } = useBuySellModal()

  const handlePurchaseToken = useCallback(() => {
    if (!coin?.ticker) return
    openBuySellModal({ isOpen: true, ticker: coin.ticker })

    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
  }, [
    coin?.ticker,
    lockedContentModalVisibility,
    openBuySellModal,
    setLockedContentModalVisibility
  ])

  const handleSendTip = useRequiresAccountCallback(() => {
    dispatch(
      beginTip({ user: tippedUser, source: tipSource, trackId: contentId })
    )

    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
  }, [
    dispatch,
    tippedUser,
    tipSource,
    contentId,
    lockedContentModalVisibility,
    setLockedContentModalVisibility
  ])

  const handleFollow = useRequiresAccountCallback(() => {
    if (isContentFollowGated(streamConditions)) {
      dispatch(
        socialActions.followUser(
          streamConditions.follow_user_id,
          followSource,
          contentId
        )
      )
    }

    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
  }, [
    dispatch,
    streamConditions,
    followSource,
    contentId,
    lockedContentModalVisibility,
    setLockedContentModalVisibility
  ])

  const renderLockedDescription = () => {
    if (isContentFollowGated(streamConditions) && followee) {
      return (
        <Text variant='body' strength='strong'>
          {messages.unlockFollowGatedContentPrefix}{' '}
          <UserLink userId={followee.user_id} />
        </Text>
      )
    }

    if (isContentTipGated(streamConditions) && tippedUser) {
      return (
        <Text variant='body' strength='strong'>
          {messages.unlockTipGatedContentPrefix}{' '}
          <UserLink userId={tippedUser.user_id} />{' '}
          {messages.unlockTipGatedContentSuffix}
        </Text>
      )
    }

    if (isContentTokenGated(streamConditions)) {
      const { token_gate } = streamConditions

      return (
        <Text variant='body' strength='strong'>
          {messages.unlockTokenGatedContentPrefix(token_gate.token_amount)}
          {coin?.ticker ? (
            <TextLink to={route.coinPage(coin.ticker)} variant='visible'>
              ${coin.ticker}
            </TextLink>
          ) : (
            messages.ofArtistsCoin
          )}
          {messages.unlockTokenGatedContentSuffix}
        </Text>
      )
    }

    if (isContentUSDCPurchaseGated(streamConditions)) {
      return (
        <Text variant='body' strength='strong' textAlign='left'>
          {messages.unlockWithPurchase}
        </Text>
      )
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }

  const renderButton = () => {
    if (isContentFollowGated(streamConditions)) {
      return (
        <Button
          variant='primary'
          color='blue'
          onClick={handleFollow}
          iconLeft={IconUserFollow}
          fullWidth
        >
          {messages.followArtist}
        </Button>
      )
    }

    if (isContentTipGated(streamConditions)) {
      return (
        <Button
          variant='primary'
          color='blue'
          onClick={handleSendTip}
          iconRight={IconTipping}
          fullWidth
        >
          {messages.sendTip}
        </Button>
      )
    }

    if (isContentTokenGated(streamConditions)) {
      return (
        <Button
          variant='primary'
          color='coinGradient'
          onClick={handlePurchaseToken}
          fullWidth
        >
          {messages.buyArtistCoin}
        </Button>
      )
    }

    if (isContentUSDCPurchaseGated(streamConditions)) {
      return (
        <Button
          variant='primary'
          color='lightGreen'
          onClick={() => {
            track(
              make({
                eventName: Name.PURCHASE_CONTENT_BUY_CLICKED,
                contentId,
                contentType
              })
            )
            handlePurchaseViaGuestCheckout()
          }}
          fullWidth
        >
          {messages.buy(
            USDC(streamConditions.usdc_purchase.price / 100).toLocaleString()
          )}
        </Button>
      )
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }

  const isMobile = useIsMobile()

  return (
    <Flex
      w='100%'
      direction={isMobile ? 'column' : 'row'}
      gap='m'
      justifyContent='space-between'
    >
      <Flex gap='s' direction='column'>
        <Flex alignItems='center' gap='s'>
          <LockedStatusBadge
            locked
            variant={
              isUSDCPurchaseGated
                ? 'premium'
                : isTokenGated
                  ? 'tokenGated'
                  : 'gated'
            }
          />
          <Text variant='label' size='l' strength='strong'>
            {isUSDCPurchaseGated ? messages.payToUnlock : messages.howToUnlock}
          </Text>
        </Flex>
        {renderLockedDescription()}
        {coin ? (
          <Flex gap='xs' alignItems='center'>
            <TokenIcon logoURI={coin.logoUri} size='l' hex />
            <Text variant='title'>${coin.ticker}</Text>
          </Flex>
        ) : null}
      </Flex>
      <Flex w={isMobile ? '100%' : BUY_BUTTON_WIDTH}>{renderButton()}</Flex>
    </Flex>
  )
}

const UnlockingGatedContentSection = ({
  contentType,
  streamConditions,
  followee,
  tippedUser,
  className
}: Omit<
  GatedContentAccessSectionProps,
  'contentId' | 'buttonClassName' | 'source' | 'trackOwner'
>) => {
  const messages = getMessages(contentType)
  const renderUnlockingDescription = () => {
    if (isContentFollowGated(streamConditions) && followee) {
      return (
        <Text>
          {messages.thankYouForFollowing}
          <UserLink userId={followee.user_id} />
          {messages.exclamationMark}
        </Text>
      )
    }

    if (isContentTipGated(streamConditions) && tippedUser) {
      return (
        <div>
          <span>{messages.thankYouForSupporting}&nbsp;</span>
          <UserLink userId={tippedUser.user_id} />
          <span className={styles.suffix}>
            {messages.unlockingTipGatedContentSuffix}
          </span>
        </div>
      )
    }

    if (isContentUSDCPurchaseGated(streamConditions)) {
      return (
        <Text variant='body' strength='strong'>
          {messages.unlockWithPurchase}
        </Text>
      )
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }

  return (
    <div className={className}>
      <Flex
        direction='row'
        className={styles.gatedContentDescriptionContainer}
        alignItems='flex-start'
        gap='s'
      >
        <Text variant='label' size='l' strength='strong'>
          <Flex alignItems='center' gap='s'>
            <LoadingSpinner className={styles.spinner} />
            {isContentUSDCPurchaseGated(streamConditions)
              ? messages.purchasing
              : messages.unlocking}
          </Flex>
        </Text>
        <Text variant='body' strength='strong'>
          {renderUnlockingDescription()}
        </Text>
      </Flex>
    </div>
  )
}

const UnlockedGatedContentSection = ({
  contentType,
  streamConditions,
  followee,
  tippedUser,
  isOwner,
  trackOwner,
  className
}: Omit<
  GatedContentAccessSectionProps,
  'contentId' | 'buttonClassName' | 'source'
>) => {
  const messages = getMessages(contentType)
  const { data: coin } = useArtistCoin(
    isContentTokenGated(streamConditions)
      ? streamConditions.token_gate.token_mint
      : ''
  )

  const renderUnlockedDescription = () => {
    if (isContentFollowGated(streamConditions) && followee) {
      return isOwner ? (
        messages.ownFollowGated
      ) : (
        <>
          {messages.thankYouForFollowing} <UserLink userId={followee.user_id} />
          {messages.unlockedFollowGatedContentSuffix}
        </>
      )
    }

    if (isContentTipGated(streamConditions) && tippedUser) {
      return isOwner ? (
        messages.ownTipGated
      ) : (
        <>
          {messages.thankYouForSupporting}{' '}
          <UserLink userId={tippedUser.user_id} />
          {messages.unlockedTipGatedContentSuffix}
        </>
      )
    }

    if (isContentTokenGated(streamConditions)) {
      return isOwner ? (
        messages.ownTokenGated
      ) : (
        <Text variant='body' strength='strong'>
          {coin?.ticker ? (
            <TextLink to={route.coinPage(coin.ticker)} variant='visible'>
              ${coin.ticker}
            </TextLink>
          ) : (
            messages.artistCoin
          )}
          {messages.unlockedTokenGatedSuffix}
        </Text>
      )
    }

    if (isContentUSDCPurchaseGated(streamConditions)) {
      return isOwner ? (
        messages.usersCanPurchase(
          USDC(streamConditions.usdc_purchase.price / 100).toLocaleString()
        )
      ) : (
        <>
          {messages.purchased}{' '}
          {trackOwner ? (
            <>
              {messages.thankYouForSupporting}{' '}
              <UserLink userId={trackOwner.user_id} />
              {messages.period}
            </>
          ) : null}
        </>
      )
    }

    console.warn(
      'No entity for stream conditions... should not have reached here.'
    )
    return null
  }

  let IconComponent = IconSparkles
  let gatedConditionTitle = messages.specialAccess

  if (isContentUSDCPurchaseGated(streamConditions)) {
    IconComponent = IconCart
    gatedConditionTitle = messages.payToUnlock
  } else if (isContentTokenGated(streamConditions)) {
    IconComponent = IconArtistCoin
    gatedConditionTitle = messages.coinGated
  }

  return (
    <Flex row className={className} w='100%' justifyContent='space-between'>
      <Flex column gap='s'>
        <Flex gap='s'>
          {isOwner ? (
            <IconComponent size='s' color='default' />
          ) : (
            <LockedStatusBadge
              locked={false}
              variant={
                isContentUSDCPurchaseGated(streamConditions)
                  ? 'premium'
                  : isContentTokenGated(streamConditions)
                    ? 'tokenGated'
                    : 'gated'
              }
            />
          )}
          <Text variant='label' size='l' strength='strong'>
            {isOwner ? gatedConditionTitle : messages.unlocked}
          </Text>
        </Flex>
        <Text variant='body' strength='strong'>
          {renderUnlockedDescription()}
        </Text>
      </Flex>
      {coin ? (
        <Flex gap='xs' alignItems='center'>
          <TokenIcon logoURI={coin.logoUri} size='l' hex />
          <Text variant='title'>${coin.ticker}</Text>
        </Flex>
      ) : null}
    </Flex>
  )
}

type GatedContentSectionProps = {
  isLoading: boolean
  contentId: ID
  contentType: PurchaseableContentType
  streamConditions: AccessConditions
  hasStreamAccess?: boolean
  isOwner: boolean
  wrapperClassName?: string
  className?: string
  buttonClassName?: string
  ownerId: ID | null
  /** More context for analytics to know about where purchases are being triggered from */
  source?: ModalSource
}

export const GatedContentSection = ({
  isLoading,
  contentId,
  contentType = PurchaseableContentType.TRACK,
  streamConditions,
  hasStreamAccess,
  isOwner,
  wrapperClassName,
  className,
  buttonClassName,
  ownerId,
  source
}: GatedContentSectionProps) => {
  const gatedContentStatusMap = useSelector(getGatedContentStatusMap)
  const gatedContentStatus = gatedContentStatusMap[contentId] ?? null

  const isFollowGated = isContentFollowGated(streamConditions)
  const isTipGated = isContentTipGated(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  const shouldDisplay =
    isFollowGated || isTipGated || isUSDCPurchaseGated || isTokenGated
  const { byId: users } = useUsers(
    [
      isFollowGated ? streamConditions.follow_user_id : null,
      isTipGated ? streamConditions.tip_user_id : null,
      isUSDCPurchaseGated ? ownerId : null
    ].filter(removeNullable)
  )
  const followee = isFollowGated ? users[streamConditions.follow_user_id] : null
  const trackOwner =
    isUSDCPurchaseGated && ownerId !== null ? users[ownerId] : null
  const tippedUser = isTipGated ? users[streamConditions.tip_user_id] : null

  const fadeIn = {
    [styles.show]: !isLoading,
    [styles.hide]: isLoading
  }

  if (!streamConditions) return null
  if (!shouldDisplay) return null

  if (hasStreamAccess) {
    return (
      <Flex
        className={cn(styles.gatedContentSection, fadeIn, wrapperClassName)}
      >
        <UnlockedGatedContentSection
          contentType={contentType}
          streamConditions={streamConditions}
          followee={followee}
          tippedUser={tippedUser}
          isOwner={isOwner}
          className={className}
          trackOwner={trackOwner}
        />
      </Flex>
    )
  }

  if (gatedContentStatus === 'UNLOCKING') {
    return (
      <Flex
        className={cn(styles.gatedContentSection, fadeIn, wrapperClassName)}
      >
        <UnlockingGatedContentSection
          contentType={contentType}
          streamConditions={streamConditions}
          followee={followee}
          tippedUser={tippedUser}
          isOwner={isOwner}
          className={className}
        />
      </Flex>
    )
  }

  return (
    <Flex className={cn(styles.gatedContentSection, fadeIn, wrapperClassName)}>
      <LockedGatedContentSection
        contentId={contentId}
        contentType={contentType}
        trackOwner={trackOwner}
        streamConditions={streamConditions}
        followee={followee}
        tippedUser={tippedUser}
        isOwner={isOwner}
        className={cn(styles.gatedContentSectionLocked, className)}
        buttonClassName={buttonClassName}
        source={source}
      />
    </Flex>
  )
}
