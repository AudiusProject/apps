import { useTopTags } from '@audius/common/api'
import { Paper, IconTrending } from '@audius/harmony'

import { SearchTag } from 'components/search-bar/SearchTag'
import { useProfileParams } from 'pages/profile-page/useProfileParams'

import { ProfilePageNavSectionItem } from './ProfilePageNavSectionItem'
import { ProfilePageNavSectionTitle } from './ProfilePageNavSectionTitle'

const messages = {
  topTags: 'Top Tags'
}

const MOST_USED_TAGS_COUNT = 5

export const ProfileTopTags = () => {
  const user = useProfileParams()
  const { data: topTags, isPending } = useTopTags({
    userId: user?.user_id,
    limit: MOST_USED_TAGS_COUNT
  })

  if (isPending || !topTags?.length) return null

  return (
    <ProfilePageNavSectionItem>
      <ProfilePageNavSectionTitle
        Icon={IconTrending}
        title={messages.topTags}
      />
      <Paper p='s' gap='s' wrap='wrap'>
        {topTags.map((tag) => (
          <SearchTag key={tag}>{tag}</SearchTag>
        ))}
      </Paper>
    </ProfilePageNavSectionItem>
  )
}
