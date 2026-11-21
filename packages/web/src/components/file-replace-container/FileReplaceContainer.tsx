import {
  IconPlay,
  IconPause,
  PlainButton,
  Flex,
  Button,
  IconArrowUpToLine,
  IconReceive
} from '@audius/harmony'
import ReactDropzone from 'react-dropzone'

const messages = {
  replace: 'Replace File',
  download: 'Download File'
}

type FileReplaceContainerProps = {
  fileName: string
  downloadEnabled?: boolean
  isPlaying?: boolean
  onTogglePlay?: () => void
  onClickReplace?: (file: File) => void
  onClickDownload?: () => void
}

export const FileReplaceContainer = ({
  fileName,
  downloadEnabled,
  isPlaying,
  onTogglePlay,
  onClickReplace,
  onClickDownload
}: FileReplaceContainerProps) => {
  return (
    <Flex justifyContent='space-between' alignItems='center' gap='l'>
      <PlainButton
        size='large'
        fullWidth
        css={{ justifyContent: 'flex-start' }}
        iconLeft={isPlaying ? IconPause : IconPlay}
        onClick={onTogglePlay}
      >
        {fileName}
      </PlainButton>
      <Flex gap='s'>
        <ReactDropzone
          style={{}}
          multiple={false}
          accept='audio/*'
          onDropAccepted={(files) => {
            if (files[0]) {
              onClickReplace?.(files[0])
            }
          }}
        >
          <Button variant='secondary' size='small' iconLeft={IconArrowUpToLine}>
            {messages.replace}
          </Button>
        </ReactDropzone>
        {downloadEnabled ? (
          <Button
            variant='secondary'
            size='small'
            iconLeft={IconReceive}
            onClick={onClickDownload}
          >
            {messages.download}
          </Button>
        ) : null}
      </Flex>
    </Flex>
  )
}
