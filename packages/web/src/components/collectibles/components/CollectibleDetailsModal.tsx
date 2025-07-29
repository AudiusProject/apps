import {
  Suspense,
  lazy,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

import { Chain, CollectibleMediaType, Collectible } from '@audius/common/models'
import {
  collectibleDetailsUISelectors,
  collectibleDetailsUIActions
} from '@audius/common/store'
import { formatDateWithTimezoneOffset, getHash } from '@audius/common/utils'
import {
  Button,
  ModalContent,
  ModalContentText,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Modal,
  IconVolumeLevel2 as IconVolume,
  IconVolumeLevel0 as IconMute,
  IconEmbed,
  IconImage,
  IconLink,
  IconShare,
  IconLogoCircleSOL,
  IconLogoCircleETH,
  Flex
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import Drawer from 'components/drawer/Drawer'
import Toast from 'components/toast/Toast'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { ComponentPlacement, MountPlacement } from 'components/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { copyToClipboard, getCopyableLink } from 'utils/clipboardUtil'
import zIndex from 'utils/zIndex'

import { collectibleMessages } from './CollectiblesPage'
import styles from './CollectiblesPage.module.css'

const Collectible3D = lazy(() =>
  import('./Collectible3D').then((module) => ({
    default: module.Collectible3D
  }))
)

const { setCollectible } = collectibleDetailsUIActions
const { getCollectibleDetails, getCollectible } = collectibleDetailsUISelectors

type CollectibleMediaProps = {
  collectible: Collectible
  isMuted: boolean
  toggleMute: () => void
  isMobile: boolean
}

const CollectibleMedia = (props: CollectibleMediaProps) => {
  const { collectible, isMuted, toggleMute, isMobile } = props

  const { mediaType, frameUrl, imageUrl, videoUrl, gifUrl, threeDUrl } =
    collectible

  const [isSvg, setIsSvg] = useState(false)

  // check for svg images to give them non-empty width
  const handleImage = useCallback(
    (imageContainer: HTMLDivElement | null) => {
      if (
        mediaType === CollectibleMediaType.IMAGE &&
        imageUrl?.endsWith('.svg') &&
        imageContainer &&
        getComputedStyle(imageContainer).width === '0px'
      ) {
        setIsSvg(true)
      }
    },
    [mediaType, imageUrl, setIsSvg]
  )

  return mediaType === CollectibleMediaType.THREE_D ? (
    <div className={styles.detailsMediaWrapper}>
      {threeDUrl ? (
        <Suspense>
          <Collectible3D isMobile={isMobile} src={threeDUrl} />
        </Suspense>
      ) : null}
    </div>
  ) : mediaType === CollectibleMediaType.GIF ||
    mediaType === CollectibleMediaType.ANIMATED_WEBP ? (
    <div className={styles.detailsMediaWrapper}>
      <img src={gifUrl!} alt='Collectible' />
    </div>
  ) : mediaType === CollectibleMediaType.VIDEO ? (
    <div className={styles.detailsMediaWrapper} onClick={toggleMute}>
      <video
        src={videoUrl!}
        poster={frameUrl ?? undefined}
        muted={isMuted}
        autoPlay
        loop
        playsInline
      >
        {collectibleMessages.videoNotSupported}
      </video>
      {isMuted ? (
        <IconMute className={styles.volumeIcon} />
      ) : (
        <IconVolume className={styles.volumeIcon} />
      )}
    </div>
  ) : (
    <div
      className={cn(styles.detailsMediaWrapper, { [styles.svg]: isSvg })}
      ref={handleImage}
    >
      <img src={imageUrl!} alt='Collectible' />
    </div>
  )
}

const CollectibleDetailsModal = ({
  isMobile,
  handle,
  onSave,
  updateProfilePicture,
  isUserOnTheirProfile,
  shareUrl,
  setIsEmbedModalOpen,
  onClose
}: {
  isMobile: boolean
  handle: string | null
  onSave?: () => void
  updateProfilePicture?: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  isUserOnTheirProfile: boolean
  shareUrl: string
  setIsEmbedModalOpen?: (val: boolean) => void
  onClose?: () => void
}) => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const [isModalOpen, setIsModalOpen] = useModalState('CollectibleDetails')
  const [isMuted, setIsMuted] = useState<boolean>(true)
  const collectible = useSelector(getCollectible)

  const [isPicConfirmModalOpen, setIsPicConfirmaModalOpen] =
    useState<boolean>(false)

  const handleClose = useCallback(() => {
    dispatch(setCollectible({ collectible: null }))
    setIsModalOpen(false)
    if (onClose) {
      // Ignore needed bc typescript doesn't think that match.params has handle property
      // @ts-ignore
      const url = `/${handle}/collectibles`
      // Push window state as to not trigger router change & component remount
      window.history.pushState('', '', url)
      onClose?.()
    }
  }, [dispatch, setIsModalOpen, onClose, handle])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted, setIsMuted])

  const handleMobileShareClick = useCallback(() => {
    copyToClipboard(shareUrl)
    toast(collectibleMessages.copied)
  }, [shareUrl, toast])

  if (!collectible) return <></>

  const onClickProfPicUpload = async () => {
    const { imageUrl } = collectible
    if (!updateProfilePicture || !onSave || imageUrl === null) return

    const blob = await fetch(imageUrl).then((r) => r.blob())
    await updateProfilePicture([blob], 'url')
    await onSave()
    setIsPicConfirmaModalOpen(false)
  }

  return (
    <>
      <Modal
        title='Collectible'
        isOpen={isModalOpen && !isMobile}
        onClose={handleClose}
        showTitleHeader
        showDismissButton
        bodyClassName={styles.modalBody}
        headerContainerClassName={styles.modalHeader}
        titleClassName={styles.modalTitle}
        allowScroll
        zIndex={zIndex.COLLECTIBLE_DETAILS_MODAL}
      >
        <div className={styles.nftModal}>
          <CollectibleMedia
            collectible={collectible}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isMobile={isMobile}
          />

          <div className={styles.details}>
            <div className={styles.detailsTitle}>{collectible.name}</div>
            <div className={styles.detailsStamp}>
              {collectible.isOwned ? (
                <span className={styles.owned}>
                  {collectibleMessages.owned}
                </span>
              ) : (
                <span className={styles.created}>
                  {collectibleMessages.created}
                </span>
              )}

              {collectible.chain === Chain.Eth ? (
                <Tooltip text='Ethereum' mount={MountPlacement.PARENT}>
                  <IconLogoCircleETH size='m' />
                </Tooltip>
              ) : (
                <Tooltip text='Solana' mount={MountPlacement.PARENT}>
                  <IconLogoCircleSOL size='m' />
                </Tooltip>
              )}
            </div>

            {collectible.dateCreated && (
              <div className={styles.dateWrapper}>
                <div className={styles.dateTitle}>Date Created:</div>
                <div className={styles.date}>
                  {formatDateWithTimezoneOffset(collectible.dateCreated)}
                </div>
              </div>
            )}

            {collectible.dateLastTransferred && (
              <div className={styles.dateWrapper}>
                <div className={styles.dateTitle}>Last Transferred:</div>
                <div className={styles.date}>
                  {formatDateWithTimezoneOffset(
                    collectible.dateLastTransferred
                  )}
                </div>
              </div>
            )}

            <div className={styles.detailsDescription}>
              {collectible.description}
            </div>

            {collectible.externalLink && (
              <a
                className={styles.link}
                href={collectible.externalLink}
                target='_blank'
                rel='noopener noreferrer'
              >
                <IconLink className={styles.linkIcon} />
                {new URL(collectible.externalLink).hostname}
              </a>
            )}

            {collectible.permaLink && (
              <a
                className={styles.link}
                href={collectible.permaLink}
                target='_blank'
                rel='noopener noreferrer'
              >
                <IconLink className={styles.linkIcon} />
                {collectibleMessages.linkToCollectible}
              </a>
            )}

            <Flex gap='m' wrap='wrap'>
              <Toast
                text={collectibleMessages.copied}
                fillParent={false}
                mount={MountPlacement.PARENT}
                placement={ComponentPlacement.TOP}
                requireAccount={false}
                tooltipClassName={styles.shareTooltip}
              >
                <Button
                  variant='secondary'
                  size='small'
                  onClick={() => copyToClipboard(shareUrl)}
                  iconLeft={IconShare}
                >
                  Share
                </Button>
              </Toast>

              <Button
                variant='secondary'
                size='small'
                onClick={() => setIsEmbedModalOpen?.(true)}
                iconLeft={IconEmbed}
              >
                Embed
              </Button>

              {isUserOnTheirProfile &&
                collectible.mediaType === CollectibleMediaType.IMAGE && (
                  <Button
                    variant='secondary'
                    size='small'
                    onClick={() => {
                      setIsModalOpen(false)
                      setIsPicConfirmaModalOpen(true)
                    }}
                    iconLeft={IconImage}
                  >
                    Set As Profile Pic
                  </Button>
                )}
            </Flex>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPicConfirmModalOpen}
        onClose={() => setIsPicConfirmaModalOpen(false)}
      >
        <ModalHeader>
          <ModalTitle
            title={collectibleMessages.setAsProfilePic}
            icon={<IconImage />}
          />
        </ModalHeader>
        <ModalContent>
          <ModalContentText>
            {collectibleMessages.setAsProfilePicDescription}
          </ModalContentText>
        </ModalContent>

        <ModalFooter>
          <Button
            variant='secondary'
            onClick={() => setIsPicConfirmaModalOpen(false)}
            fullWidth
          >
            {collectibleMessages.setAsProfilePickCancel}
          </Button>
          <Button variant='primary' onClick={onClickProfPicUpload} fullWidth>
            {collectibleMessages.setAsProfilePickConfirm}
          </Button>
        </ModalFooter>
      </Modal>

      <Drawer
        isOpen={isModalOpen && isMobile}
        onClose={handleClose}
        isFullscreen
      >
        <div className={styles.nftDrawer}>
          <CollectibleMedia
            collectible={collectible}
            isMuted={isMuted}
            toggleMute={toggleMute}
            isMobile={isMobile}
          />

          <div className={styles.details}>
            <div className={styles.detailsTitle}>{collectible.name}</div>
            <div className={styles.detailsStamp}>
              {collectible.isOwned ? (
                <span className={styles.owned}>
                  {collectibleMessages.owned}
                </span>
              ) : (
                <span className={styles.created}>
                  {collectibleMessages.created}
                </span>
              )}

              {collectible.chain === Chain.Eth ? (
                <IconLogoCircleETH size='m' />
              ) : (
                <IconLogoCircleSOL size='m' />
              )}
            </div>

            {collectible.dateCreated && (
              <div className={styles.dateWrapper}>
                <div className={styles.dateTitle}>Date Created:</div>
                <div className={styles.date}>
                  {formatDateWithTimezoneOffset(collectible.dateCreated)}
                </div>
              </div>
            )}

            {collectible.dateLastTransferred && (
              <div className={styles.dateWrapper}>
                <div className={styles.dateTitle}>Last Transferred:</div>
                <div className={styles.date}>
                  {formatDateWithTimezoneOffset(
                    collectible.dateLastTransferred
                  )}
                </div>
              </div>
            )}

            <div className={styles.detailsDescription}>
              {collectible.description}
            </div>

            {collectible.externalLink && (
              <a
                className={styles.link}
                href={collectible.externalLink}
                target='_blank'
                rel='noopener noreferrer'
              >
                <IconLink className={styles.linkIcon} />
                {new URL(collectible.externalLink).hostname}
              </a>
            )}
            {collectible.permaLink && (
              <a
                className={styles.link}
                href={collectible.permaLink}
                target='_blank'
                rel='noopener noreferrer'
              >
                <IconLink className={styles.linkIcon} />
                {collectibleMessages.linkToCollectible}
              </a>
            )}

            <Button
              variant='secondary'
              size='small'
              onClick={handleMobileShareClick}
              iconLeft={IconShare}
            >
              Share
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}

const ConnectedCollectibleDetailsModal = () => {
  const isMobile = useIsMobile()
  const {
    ownerHandle,
    embedCollectibleHash,
    isUserOnTheirProfile,
    updateProfilePicture,
    onSave,
    setIsEmbedModalOpen,
    onClose
  } = useSelector(getCollectibleDetails)
  const collectible = useSelector(getCollectible)

  const shareUrl = useMemo(() => {
    if (!ownerHandle) return ''

    // Use embedCollectibleHash if available (from deep link), otherwise generate from collectible ID
    const collectibleHash =
      embedCollectibleHash || (collectible ? getHash(collectible.id) : '')

    return getCopyableLink(
      `/${ownerHandle}/collectibles${
        collectibleHash ? `/${collectibleHash}` : ''
      }`
    )
  }, [ownerHandle, embedCollectibleHash, collectible])

  return (
    <CollectibleDetailsModal
      isMobile={isMobile}
      handle={ownerHandle}
      isUserOnTheirProfile={isUserOnTheirProfile}
      updateProfilePicture={updateProfilePicture}
      onSave={onSave}
      shareUrl={shareUrl}
      setIsEmbedModalOpen={setIsEmbedModalOpen}
      onClose={onClose}
    />
  )
}

export default ConnectedCollectibleDetailsModal
