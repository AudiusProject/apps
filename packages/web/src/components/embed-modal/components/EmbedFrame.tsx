import cn from 'classnames'

import styles from './EmbedFrame.module.css'

type EmbedFrameProps = {
  className?: string
  frameString: string
  width?: number
}

const EmbedFrame = ({ className, frameString, width }: EmbedFrameProps) => {
  if (!frameString) return null
  const frame = (
    <div
      className={cn(styles.frame, className ?? '')}
      dangerouslySetInnerHTML={{ __html: frameString }}
    />
  )
  return width ? (
    <div
      className={cn(styles.wrapper, className ?? '')}
      style={{ width: `${width}px` }}
    >
      {frame}
    </div>
  ) : (
    frame
  )
}

export default EmbedFrame
