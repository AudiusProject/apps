import { MouseEventHandler, useCallback, useEffect } from 'react'

import { useLinkUnfurlMetadata } from '@audius/common/hooks'
import { useLeavingAudiusModal } from '@audius/common/store'
import { isAudiusUrl } from '@audius/common/utils'
import cn from 'classnames'

import { ChatLinkPreviewSkeleton } from './ChatLinkPreviewSkeleton'
import styles from './LinkPreview.module.css'

const safeHostname = (candidate?: string) => {
  if (!candidate) return null
  try {
    return new URL(candidate).hostname
  } catch {
    return null
  }
}

type LinkPreviewProps = {
  href: string
  chatId: string
  messageId: string
  onEmpty?: () => void
  onSuccess?: () => void
  className?: string
}
export const LinkPreview = (props: LinkPreviewProps) => {
  const { href, chatId, messageId, onEmpty, onSuccess } = props
  const metadataRaw = useLinkUnfurlMetadata(chatId, messageId, href)
  // While the unfurl metadata hasn't been fetched yet, defer firing the
  // parent callbacks so the URL text doesn't flash before the preview.
  const isPending = metadataRaw === undefined
  const metadata = metadataRaw ?? {}
  const { description, title, site_name: siteName, image } = metadata
  const willRender = !!(description || title || image)
  // Unfurl-provided urls aren't guaranteed to be fully-qualified, so guard
  // against `new URL` throwing and fall back to the original href the user
  // pasted (which linkifyjs already validated). A throw here would crash
  // the entire ChatMessageList render.
  const domain = safeHostname(metadata?.url) ?? safeHostname(href) ?? ''
  const { onOpen: setLeavingAudiusModalOpen } = useLeavingAudiusModal()

  const handleClick: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      if (!isAudiusUrl(e.currentTarget.href)) {
        e.nativeEvent.preventDefault()
        setLeavingAudiusModalOpen({ link: href })
      }
    },
    [setLeavingAudiusModalOpen, href]
  )

  useEffect(() => {
    if (isPending) return
    if (willRender) {
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [isPending, willRender, onSuccess, onEmpty])

  if (isPending) {
    return <ChatLinkPreviewSkeleton className={props.className} />
  }

  return willRender ? (
    <a
      className={cn(styles.root, props.className)}
      href={href}
      title={title || siteName || description || 'View Image'}
      target={'_blank'}
      rel='noreferrer noopener'
      onClick={handleClick}
    >
      {description || title ? (
        <>
          {image ? (
            <span className={styles.thumbnail}>
              <img src={image} alt={siteName} />
            </span>
          ) : null}
          <span className={styles.domain}>{domain}</span>
          <span className={styles.text}>
            {title ? <span className={styles.title}>{title}</span> : null}
            {description ? (
              <span className={styles.description}>{description}</span>
            ) : null}
          </span>
        </>
      ) : image ? (
        <span>
          <img className={styles.image} src={image} alt={siteName} />
        </span>
      ) : null}
    </a>
  ) : null
}
