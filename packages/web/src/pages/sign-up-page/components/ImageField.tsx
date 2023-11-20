import { ReactNode, useCallback } from 'react'

import { Nullable } from '@audius/common'
import cn from 'classnames'
import { useField } from 'formik'
import ReactDropzone, { DropFilesEventHandler } from 'react-dropzone'

import {
  ALLOWED_IMAGE_FILE_TYPES,
  resizeImage
} from 'utils/imageProcessingUtil'

import styles from './ImageField.module.css'

const allowedImages = ALLOWED_IMAGE_FILE_TYPES.join(', ')

type ImageFieldValue = Nullable<{
  file: File
  url: string
}>

type ImageFieldProps = {
  name: string
  className?: string
  children: (urlValue: ImageFieldValue | null) => ReactNode | ReactNode[]
  onChange?: (image: ImageFieldValue) => void
}

export const ImageField = (props: ImageFieldProps) => {
  const { name, className, children, onChange } = props

  const [field, , { setValue }] = useField<ImageFieldValue>(name)
  const { value } = field

  const handleChange: DropFilesEventHandler = useCallback(
    async (files) => {
      const [file] = files
      const resizedFile = await resizeImage(file)
      const url = URL.createObjectURL(resizedFile)
      const image = { file: resizedFile, url }
      setValue(image)
      if (onChange) {
        onChange(image)
      }
    },
    [setValue, onChange]
  )

  return (
    <ReactDropzone
      onDrop={handleChange}
      data-testid={`${name}-dropzone`}
      accept={allowedImages}
      className={cn(styles.defaultStyles, className)}
    >
      {children(value)}
    </ReactDropzone>
  )
}
