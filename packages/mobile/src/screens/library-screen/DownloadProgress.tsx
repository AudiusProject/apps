import { reachabilitySelectors } from '@audius/common/store'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { Text } from 'app/components/core'
import { ProgressBar } from 'app/components/progress-bar'
import { getOfflineTrackStatus } from 'app/store/offline-downloads/selectors'
import { OfflineDownloadStatus } from 'app/store/offline-downloads/slice'
import { makeStyles } from 'app/styles'

const { getIsReachable } = reachabilitySelectors

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing(2)
  },
  text: {
    marginBottom: 2
  },
  progressBar: {
    width: 98,
    height: spacing(1),
    borderRadius: 8,
    marginVertical: 0,
    backgroundColor: palette.neutralLight4
  }
}))

export const DownloadProgress = () => {
  const styles = useStyles()
  const downloadStatus = useSelector(getOfflineTrackStatus)
  const isReachable = useSelector(getIsReachable)
  const numDownloads = Object.keys(downloadStatus).length
  const numDownloadsComplete = Object.values(downloadStatus).filter(
    (status) =>
      status === OfflineDownloadStatus.SUCCESS ||
      status === OfflineDownloadStatus.ERROR ||
      status === OfflineDownloadStatus.ABANDONED
  ).length
  const numDownloadsSuccess = Object.values(downloadStatus).filter(
    (status) => status === OfflineDownloadStatus.SUCCESS
  ).length

  if (numDownloadsComplete === numDownloads || !isReachable) return null

  return (
    <View style={styles.root}>
      <Text style={styles.text} color='neutral' weight='demiBold' fontSize='xs'>
        {`${numDownloadsSuccess}/${numDownloads}`}
      </Text>
      <ProgressBar
        style={{
          root: styles.progressBar
        }}
        progress={numDownloadsSuccess}
        max={numDownloads}
      />
    </View>
  )
}
