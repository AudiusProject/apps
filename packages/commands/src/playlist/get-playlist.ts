import { Command } from '@commander-js/extra-typings'
import { getCurrentUserId, initializeAudiusSdk } from '../utils'

export const getPlaylistCommand = new Command('get')
  .description('Get a playlist by ID')
  .argument('<playlistId>', 'The playlist to fetch')
  .option('--from <from>', 'The account to use')
  .action(async (playlistId, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()
    const { data: playlist } = await audiusSdk.playlists.getPlaylist({
      userId,
      playlistId
    })
    console.info(JSON.stringify(playlist, undefined, 2))
  })
