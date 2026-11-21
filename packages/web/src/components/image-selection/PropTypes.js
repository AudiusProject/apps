import PropTypes from 'prop-types'

export const ImageSelectionProps = {
  error: PropTypes.bool.isRequired,
  onAfterClose: PropTypes.func,
  onSelect: PropTypes.func.isRequired,
  source: PropTypes.oneOf(['ProfilePicture', 'CoverPhoto', 'UploadArtwork'])
}
