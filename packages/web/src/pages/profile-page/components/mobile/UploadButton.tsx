import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { Button, Flex, IconCloudUpload } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

const { UPLOAD_PAGE } = route

const UploadButton = () => {
  const dispatch = useDispatch()

  const handleClick = useCallback(() => {
    dispatch(push(UPLOAD_PAGE))
  }, [dispatch])

  return (
    <Flex pv='s' ph='m'>
      <Button
        variant='tertiary'
        onClick={handleClick}
        iconLeft={IconCloudUpload}
        fullWidth
      >
        Upload Track
      </Button>
    </Flex>
  )
}

export default UploadButton
