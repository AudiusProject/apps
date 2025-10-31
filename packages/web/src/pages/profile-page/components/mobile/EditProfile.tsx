import { IconLink, IconTikTok, IconX, IconInstagram } from '@audius/harmony'

import EditableRow, { Format } from 'components/groupable-list/EditableRow'
import GroupableList from 'components/groupable-list/GroupableList'
import Grouping from 'components/groupable-list/Grouping'

import styles from './EditProfile.module.css'

type EditProfileProps = {
  name: string
  bio: string
  location: string
  xHandle: string
  instagramHandle: string
  tikTokHandle: string
  twitterVerified: boolean
  instagramVerified: boolean
  tikTokVerified: boolean
  website: string

  onUpdateName: (name: string) => void
  onUpdateBio: (bio: string) => void
  onUpdateLocation: (location: string) => void
  onUpdateXHandle: (handle: string) => void
  onUpdateInstagramHandle: (handle: string) => void
  onUpdateTikTokHandle: (handle: string) => void
  onUpdateWebsite: (website: string) => void
}

const EditProfile = ({
  name,
  bio,
  location,
  xHandle,
  instagramHandle,
  tikTokHandle,
  twitterVerified,
  instagramVerified,
  tikTokVerified,
  website,
  onUpdateName,
  onUpdateBio,
  onUpdateLocation,
  onUpdateXHandle,
  onUpdateInstagramHandle,
  onUpdateTikTokHandle,
  onUpdateWebsite
}: EditProfileProps) => {
  return (
    <div className={styles.editProfile}>
      <GroupableList>
        <Grouping>
          <EditableRow
            label='Name'
            format={Format.INPUT}
            initialValue={name}
            onChange={onUpdateName}
            maxLength={32}
          />
          <EditableRow
            label='Bio'
            format={Format.TEXT_AREA}
            initialValue={bio}
            onChange={onUpdateBio}
            maxLength={256}
          />
          <EditableRow
            label='Location'
            format={Format.INPUT}
            initialValue={location}
            onChange={onUpdateLocation}
            maxLength={30}
          />
          <EditableRow
            label={<IconX className={styles.icon} />}
            format={Format.INPUT}
            initialValue={xHandle}
            onChange={onUpdateXHandle}
            maxLength={200}
            inputPrefix='@'
            isDisabled={!!twitterVerified}
          />
          <EditableRow
            label={<IconInstagram className={styles.icon} />}
            format={Format.INPUT}
            initialValue={instagramHandle}
            onChange={onUpdateInstagramHandle}
            maxLength={200}
            inputPrefix='@'
            isDisabled={!!instagramVerified}
          />
          <EditableRow
            label={<IconTikTok className={styles.icon} />}
            format={Format.INPUT}
            initialValue={tikTokHandle}
            onChange={onUpdateTikTokHandle}
            maxLength={200}
            inputPrefix='@'
            isDisabled={!!tikTokVerified}
          />
          <EditableRow
            label={<IconLink className={styles.icon} />}
            format={Format.INPUT}
            initialValue={website}
            onChange={onUpdateWebsite}
            maxLength={200}
          />
        </Grouping>
      </GroupableList>
    </div>
  )
}

export default EditProfile
