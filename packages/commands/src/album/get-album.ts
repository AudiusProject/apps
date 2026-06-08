import { Command } from '@commander-js/extra-typings'
import { getCurrentUserId, initializeAudiusSdk } from '../utils'

export const getAlbumCommand = new Command('get')
  .description('Get an album by ID')
  .argument('<albumId>', 'The album to fetch')
  .option('--from <from>', 'The account to use')
  .action(async (albumId, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()
    const { data: playlist } = await audiusSdk.playlists.getPlaylist({
      userId,
      playlistId: albumId
    })
    console.info(JSON.stringify(playlist, undefined, 2))
  })
