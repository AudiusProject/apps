import { useState, useRef, useCallback } from 'react'

import { IconCloudUpload as IconUpload } from '@audius/harmony'
import cn from 'classnames'

import loadingSpinner from 'assets/animations/loadingSpinner.json'
import { LazyLottie as Lottie } from 'components/lottie/LazyLottie'

import styles from './UploadStub.module.css'

type UploadStubProps = {
  onChange: (
    selectedFiles: any,
    source: 'original' | 'unsplash' | 'url'
  ) => void
  // Manually override the processing state
  isProcessing?: boolean
  isHidden?: boolean
}

const UploadStub = ({
  onChange,
  isProcessing = false,
  isHidden = false
}: UploadStubProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)

  const onClickInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [inputRef])

  const handleChange = useCallback(
    async (e: any) => {
      if (inputRef.current) {
        setProcessing(true)
        await onChange(inputRef.current.files, 'original')
        setProcessing(false)
      }
    },
    [onChange]
  )

  return (
    <div
      className={cn(styles.uploadStub, {
        [styles.hide]: isHidden
      })}
      onClick={onClickInput}
    >
      <div className={styles.screen} />
      {processing || isProcessing ? (
        <div className={styles.animation}>
          <Lottie loop autoplay animationData={loadingSpinner} />
        </div>
      ) : (
        <IconUpload className={styles.iconUpload} />
      )}
      <input
        ref={inputRef}
        type='file'
        name='name'
        accept='image/*'
        style={{
          display: 'none'
        }}
        onChange={handleChange}
      />
    </div>
  )
}

export default UploadStub
