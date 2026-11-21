import { useContext } from 'react'

import IconShare from '../../assets/img/iconShare.svg'
import { share } from '../../util/shareUtil'
import { ToastContext } from '../toast/ToastContext'

import Button from './Button'
import styles from './ShareButton.module.css'

const messages = {
  toast: 'Link Copied To Clipboard'
}

const ShareButton = ({ url, title, creator }) => {
  const { toast } = useContext(ToastContext)

  const onShare = () => {
    if (!navigator.share) {
      toast(messages.toast)
    }
    share(url, title, creator)
  }

  return (
    <Button
      icon={<IconShare />}
      onClick={onShare}
      className={styles.container}
    />
  )
}

export default ShareButton
