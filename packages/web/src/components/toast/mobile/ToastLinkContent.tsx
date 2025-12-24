import { useContext } from 'react'

import { Link } from 'react-router'

import { ToastContext } from '../ToastContext'

import styles from './ToastLinkContent.module.css'

type ToastLinkContentProps = {
  link: string
  linkText: string
  text: string
  linkIcon?: JSX.Element
}

/**
 * This component can be used as the content of a Toast to render a link
 * in addition to text
 */
const ToastLinkContent = ({
  link,
  linkText,
  text,
  linkIcon
}: ToastLinkContentProps) => {
  const { clear: clearToasts } = useContext(ToastContext)

  return (
    <div>
      <span className={styles.text}>{text}</span>
      <Link to={link} className={styles.link} onClick={clearToasts}>
        {linkText}
        {linkIcon || null}
      </Link>
    </div>
  )
}

export default ToastLinkContent
