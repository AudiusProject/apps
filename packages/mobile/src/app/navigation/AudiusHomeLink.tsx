import { Link } from '@react-navigation/native'
import { TouchableOpacity } from 'react-native-gesture-handler'

import { IconAudiusLogoHorizontal } from '@audius/harmony-native'

export const AudiusHomeLink = () => {
  return (
    <TouchableOpacity>
      <Link screen='trending' params={{}}>
        <IconAudiusLogoHorizontal height={24} width={100} color='subdued' />
      </Link>
    </TouchableOpacity>
  )
}
