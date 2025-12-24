import { useCollection } from '@audius/common/api'
import {
  IconPencil,
  IconButton,
  IconButtonProps,
  Tooltip
} from '@audius/harmony'
import { pick } from 'lodash'
import { Link } from 'react-router'

const messages = {
  edit: (isAlbum: boolean) => `Edit ${isAlbum ? 'Album' : 'Playlist'}`
}

type EditButtonProps = Partial<IconButtonProps> & {
  collectionId: number
}

export const EditButton = (props: EditButtonProps) => {
  const { collectionId, ...other } = props
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) => pick(collection, ['is_album', 'permalink'])
  })

  if (!partialCollection) return null

  const { is_album, permalink } = partialCollection

  return (
    <Tooltip text={messages.edit(is_album)}>
      <IconButton
        color='subdued'
        icon={IconPencil}
        size='2xl'
        aria-label={messages.edit(is_album)}
        asChild
        {...other}
      >
        <Link to={`${permalink}/edit`} />
      </IconButton>
    </Tooltip>
  )
}
