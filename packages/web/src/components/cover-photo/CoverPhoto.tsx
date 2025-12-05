import { memo, useMemo, useState } from 'react'

import { imageCoverPhotoBlank } from '@audius/common/assets'
import { WidthSizes } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import cn from 'classnames'
import Lottie from 'lottie-react'
import { FileWithPreview } from 'react-dropzone'

import loadingSpinner from 'assets/animations/loadingSpinner.json'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import ImageSelectionButton from 'components/image-selection/ImageSelectionButton'
import { useCoverPhoto } from 'hooks/useCoverPhoto'

import styles from './CoverPhoto.module.css'

const messages = {
  imageName: 'Cover Photo',
  altText: 'User Cover Photo'
}

type CoverPhotoProps = {
  userId: Nullable<number>
  updatedCoverPhoto?: string
  className?: string
  loading?: boolean
  error?: boolean
  edit?: boolean
  darken?: boolean
  onDrop?: (
    file: FileWithPreview[],
    source: 'original' | 'unsplash' | 'url'
  ) => Promise<void>
}

const CoverPhoto = ({
  userId,
  updatedCoverPhoto,
  className,
  error,
  edit = false,
  darken = false,
  onDrop
}: CoverPhotoProps) => {
  const [processing, setProcessing] = useState(false)
  const gradient = darken
    ? 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)'
    : 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.05) 70%, rgba(0, 0, 0, 0.2) 100%)'

  const { image, shouldBlur } = useCoverPhoto({
    userId: userId ?? undefined,
    size: WidthSizes.SIZE_2000
  })

  const imageSettings = useMemo(() => {
    if (image) {
      const noUserCoverPhoto =
        image === imageCoverPhotoBlank && !updatedCoverPhoto
      if (noUserCoverPhoto) {
        return {
          backgroundImage: `${gradient}, url(${imageCoverPhotoBlank})`,
          backgroundStyle: {
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto'
          },
          immediate: false
        }
      } else {
        return {
          backgroundImage: `${gradient}, url(${updatedCoverPhoto || image})`,
          backgroundStyle: {
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover'
          },
          immediate: false
        }
      }
    } else {
      return {
        backgroundImage: gradient,
        backgroundStyle: {},
        immediate: true
      }
    }
  }, [image, updatedCoverPhoto, gradient])

  const handleDrop = async (
    file: Promise<FileWithPreview[]>,
    source: 'original' | 'unsplash' | 'url'
  ) => {
    setProcessing(true)
    const image = await file
    await onDrop?.(([] as FileWithPreview[]).concat(image), source)
    setProcessing(false)
  }

  const loadingElement = (
    <div className={cn(styles.overlay, { [styles.processing]: processing })}>
      <Lottie loop autoplay animationData={loadingSpinner} />
    </div>
  )

  return (
    <div className={cn(styles.coverPhoto, className)}>
      <DynamicImage
        alt={messages.altText}
        image={imageSettings.backgroundImage}
        isUrl={false}
        wrapperClassName={styles.photo}
        imageStyle={imageSettings.backgroundStyle}
        useBlur={shouldBlur}
        usePlaceholder={false}
        immediate={imageSettings.immediate}
      >
        <div className={styles.spinner}>
          {processing ? loadingElement : null}
        </div>
      </DynamicImage>

      <div className={styles.button}>
        {edit ? (
          // @ts-ignore
          <ImageSelectionButton
            imageName={messages.imageName}
            hasImage={Boolean(image || updatedCoverPhoto)}
            error={!!error}
            onSelect={handleDrop}
            source='CoverPhoto'
          />
        ) : null}
      </div>
    </div>
  )
}

export default memo(CoverPhoto)
