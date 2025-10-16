import { useState, useCallback, useRef } from 'react'

import { RandomImage } from '@audius/common/services'
import {
  Flex,
  Button,
  Popup,
  SegmentedControl,
  IconSearch
} from '@audius/harmony'
import cn from 'classnames'
import PropTypes from 'prop-types'
import { useWindowSize } from 'react-use'

import { Dropzone } from 'components/upload/Dropzone'
import { InvalidFileType } from 'components/upload/InvalidFileType'
import { useMainContentRef } from 'pages/MainContentContext'
import zIndex from 'utils/zIndex'

import styles from './ImageSelectionPopup.module.css'
import { ImageSelectionProps } from './PropTypes'

const POPULAR_TERMS = ['neon', 'space', 'beach', 'nature', 'abstract']

const messages = {
  uploadYourOwn: 'Upload',
  findArtwork: 'Find Artwork',
  suggestionHeader: 'Suggested Searches',
  search: 'Search',
  searchAgain: 'Search Again',
  fromUnsplash: 'Photos from Unsplash',
  popupTitle: 'Add Artwork'
}

const DropzonePage = ({ error, onSelect }) => {
  const onDropzoneSelect = useCallback(
    (file) => onSelect(file, 'original'),
    [onSelect]
  )

  return (
    <Flex column mt='l' alignItems='center' gap='s'>
      {error ? (
        <InvalidFileType reason='type' className={styles.invalidFileType} />
      ) : null}
      <Dropzone
        type='image'
        className={styles.dropzone}
        allowMultiple={false}
        onDropAccepted={onDropzoneSelect}
      />
    </Flex>
  )
}

const RandomPage = ({ onSelect }) => {
  const [randomPhotoQuery, setRandomPhotoQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const inputRef = useRef(null)

  const getRandomPhoto = async (query) => {
    setSearched(true)
    const value = RandomImage.get(query)
    if (value) {
      await onSelect(value, 'unsplash')
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      getRandomPhoto(randomPhotoQuery)
    }
  }

  const onClickTerm = (term) => {
    setRandomPhotoQuery(term)
    getRandomPhoto(term)
  }

  return (
    <div className={styles.random}>
      <div className={styles.query}>
        <IconSearch color='default' className={styles.iconSearch} />
        <input
          ref={inputRef}
          placeholder='Search Images'
          type='text'
          value={randomPhotoQuery}
          onChange={(e) => {
            setRandomPhotoQuery(e.target.value)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className={styles.buttonWrapper}>
        <Button
          variant='primary'
          size='small'
          fullWidth
          onClick={() => getRandomPhoto(randomPhotoQuery)}
        >
          {searched ? messages.searchAgain : messages.search}
        </Button>
      </div>
      <div className={styles.suggestion}>
        <div className={styles.suggestionHeader}>
          {messages.suggestionHeader}
        </div>
        <span className={styles.terms}>
          {POPULAR_TERMS.map((term, i) => {
            return (
              <span key={term}>
                <span className={styles.term} onClick={() => onClickTerm(term)}>
                  {term}
                </span>
                {i !== POPULAR_TERMS.length - 1 && (
                  <span className={styles.comma}>,</span>
                )}
              </span>
            )
          })}
        </span>
        <div className={styles.credit}>{messages.fromUnsplash}</div>
      </div>
    </div>
  )
}

const ImageSelectionPopup = ({
  anchorRef,
  className,
  isVisible = true,
  error,
  onClose,
  onAfterClose,
  onSelect,
  source
}) => {
  const mainContentRef = useMainContentRef()
  const [page, setPage] = useState(messages.uploadYourOwn)
  const windowSize = useWindowSize()

  const handleClose = () => {
    setPage(messages.uploadYourOwn)
    onClose()
  }

  const pageMap = {
    [messages.uploadYourOwn]: (
      <DropzonePage error={error} onSelect={onSelect} />
    ),
    [messages.findArtwork]: <RandomPage onSelect={onSelect} />
  }

  const tabSliderOptions = [
    {
      key: messages.uploadYourOwn,
      text: messages.uploadYourOwn
    },
    {
      key: messages.findArtwork,
      text: messages.findArtwork
    }
  ]

  let anchorOrigin = { vertical: 'bottom', horizontal: 'center' }
  let transformOrigin = { vertical: 'top', horizontal: 'center' }

  if (windowSize.width >= 1000 || windowSize.height < 820) {
    anchorOrigin = { vertical: 'center', horizontal: 'left' }
    transformOrigin = { vertical: 'center', horizontal: 'right' }
  }

  return (
    <Popup
      anchorRef={anchorRef}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      className={cn(styles.popup, className)}
      isVisible={isVisible}
      onClose={handleClose}
      onAfterClose={onAfterClose}
      showHeader={true}
      title={messages.popupTitle}
      zIndex={zIndex.IMAGE_SELECTION_POPUP}
      containerRef={mainContentRef}
    >
      <SegmentedControl
        className={styles.slider}
        options={tabSliderOptions}
        selected={page}
        onSelectOption={setPage}
      />
      {pageMap[page]}
    </Popup>
  )
}

ImageSelectionPopup.propTypes = {
  className: PropTypes.string,
  isVisible: PropTypes.bool.isRequired,
  ...ImageSelectionProps
}

export default ImageSelectionPopup
