import { useCallback } from 'react'

import { MobileOS } from '@audius/common/models'
import { route } from '@audius/common/utils'
import {
  IconAudiusLogo,
  IconStars,
  IconCloudUpload as IconUpload,
  IconSpeaker,
  IconListens,
  IconMessage,
  Button
} from '@audius/harmony'

import Drawer from 'components/drawer/Drawer'
import { getMobileOS } from 'utils/clientUtil'

import styles from './DownloadMobileAppDrawer.module.css'

const { ANDROID_PLAY_STORE_LINK, IOS_APP_STORE_LINK, IOS_WEBSITE_STORE_LINK } =
  route

const messages = {
  header: 'Download the App',
  subheader: 'Download the Audius App & never miss a beat! ',
  audioQuality: 'Enjoy stunning audio quality',
  exclusiveContent: 'Access exclusive content',
  message: 'Message & connect with fans',
  upload: 'Upload Your Music on the go',
  download: 'Download & listen offline',
  buttonText: 'Download The App'
}

type DownloadMobileAppDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export const DownloadMobileAppDrawer = (
  props: DownloadMobileAppDrawerProps
) => {
  const { isOpen, onClose } = props
  const goToAppStore = useCallback(() => {
    switch (getMobileOS()) {
      case MobileOS.IOS:
        window.location.href = IOS_APP_STORE_LINK
        break
      case MobileOS.ANDROID:
        window.location.href = ANDROID_PLAY_STORE_LINK
        break
      default:
        window.location.href = IOS_WEBSITE_STORE_LINK
        break
    }
  }, [])

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className={styles.root}>
        <h4 className={styles.header}>
          <IconAudiusLogo color='subdued' size='l' />
          {messages.header}
        </h4>
        <div className={styles.subheader}>{messages.subheader}</div>
        <ul className={styles.features}>
          <li>
            <IconSpeaker className={styles.icon} />{' '}
            <span>{messages.audioQuality}</span>
          </li>
          <li>
            <IconStars className={styles.icon} />
            <span>{messages.exclusiveContent}</span>
          </li>
          <li>
            <IconMessage className={styles.icon} />
            <span>{messages.message}</span>
          </li>
          <li>
            <IconUpload className={styles.icon} />
            <span>{messages.upload}</span>
          </li>
          <li>
            <IconListens className={styles.icon} />
            <span>{messages.download}</span>
          </li>
        </ul>
        <Button variant='primary' onClick={goToAppStore} fullWidth>
          {messages.buttonText}
        </Button>
      </div>
    </Drawer>
  )
}
