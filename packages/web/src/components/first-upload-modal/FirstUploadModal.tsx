import { useCallback, useEffect } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Name, SquareSizes } from '@audius/common/models'
import { musicConfettiActions } from '@audius/common/store'
import { Modal, SocialButton, Image } from '@audius/harmony'
import cn from 'classnames'
import { connect, useDispatch } from 'react-redux'
import { Dispatch } from 'redux'

import { useRecord, make } from 'common/store/analytics/actions'
import ConnectedMusicConfetti from 'components/music-confetti/ConnectedMusicConfetti'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { AppState } from 'store/types'
import { fullProfilePage } from 'utils/route'
import { openXLink } from 'utils/xShare'

import styles from './FirstUploadModal.module.css'
import { getIsOpen } from './store/selectors'
import { setVisibility } from './store/slice'
const { show } = musicConfettiActions

const messages = {
  first: 'You just uploaded your first track to Audius!',
  deal: 'That’s a pretty big deal.',
  share: 'Share with your fans and let them know you’re here!',
  shareButton: 'Share With Your Fans',
  // Note: twitter auto appends the link to the text
  tweet:
    'I just joined @audius and uploaded my first track! Check out my profile $AUDIO'
}

const Title = () => {
  return (
    <div className={styles.title}>
      <span>Congratulations</span>
      <i className='emoji face-with-party-horn-and-party-hat xl' />
    </div>
  )
}

type OwnProps = {}
type FirstUploadModalProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const FirstUploadModal = ({ isOpen, close }: FirstUploadModalProps) => {
  const { data: accountUser } = useCurrentAccountUser({
    select: (user) => ({
      userId: user?.user_id,
      handle: user?.handle,
      name: user?.name
    })
  })
  const { userId, handle, name } = accountUser ?? {}
  const image = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_480_BY_480
  })

  const record = useRecord()
  const onShare = useCallback(() => {
    if (!handle) return
    const url = fullProfilePage(handle)
    const text = messages.tweet
    openXLink(url, text)
    record(make(Name.TWEET_FIRST_UPLOAD, { handle }))
  }, [handle, record])

  const dispatch = useDispatch()
  useEffect(() => {
    if (isOpen) {
      dispatch(show())
    }
  }, [isOpen, dispatch])

  if (!userId) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={close}
        bodyClassName={styles.modalBody}
        contentHorizontalPadding={32}
        showTitleHeader
        showDismissButton
        dismissOnClickOutside={false}
        title={<Title />}
      >
        <div className={styles.content}>
          <div className={styles.artist}>
            <Image
              src={image}
              className={cn(styles.imageWrapper, styles.image)}
            />
            <div className={styles.name}>
              <span>{name}</span>
              <UserBadges
                userId={userId}
                className={styles.iconVerified}
                size='2xs'
              />
            </div>
            <div className={styles.handle}>{`@${handle}`}</div>
          </div>
          <div className={styles.callToAction}>
            <div className={styles.text}>{messages.first}</div>
            <div className={styles.text}>{messages.deal}</div>
            <div className={styles.text}>{messages.share}</div>
            <SocialButton
              socialType='x'
              onClick={onShare}
              className={styles.tweetButton}
            >
              {messages.shareButton}
            </SocialButton>
          </div>
        </div>
      </Modal>
      {isOpen && <ConnectedMusicConfetti />}
    </>
  )
}

function mapStateToProps(state: AppState) {
  return {
    isOpen: getIsOpen(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    close: () => dispatch(setVisibility({ isOpen: false }))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(FirstUploadModal)
