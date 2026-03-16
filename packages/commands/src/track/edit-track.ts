import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'
import { getCurrentUserId, initializeAudiusSdk, parseBoolean } from '../utils'
import { Mood, type Genre } from '@audius/sdk/services'

export const editTrackCommand = new Command('edit')
  .description('Update an existing track')
  .argument('<trackId>', 'Id of track to update')
  .option('-t, --title <title>', 'Title of track')
  .option('-a, --tags <tags>', 'Tags of track')
  .option('-d, --description <description>', 'Description of track')
  .option('-m, --mood <mood>', 'Mood of track')
  .option('-g, --genre <genre>', 'Genre of track')
  .option(
    '-s, --preview-start-seconds <seconds>',
    'Track preview start time (seconds)',
    parseInt
  )
  .option('-l, --license <license>', 'License of track')
  .option('-f, --from <from>', 'The account to edit the track from')
  .option(
    '-r, --stream-conditions <stream conditions>',
    'The stream conditions object; sets track as stream gated'
  )
  .option(
    '-u, --is-unlisted [isUnlisted]',
    'Change track visibility',
    parseBoolean
  )
  .option('-x, --remixOf <remixOf>', 'Set the original track of this remix')
  .action(
    async (
      trackId,
      {
        title,
        tags,
        description,
        mood,
        genre,
        previewStartSeconds,
        license,
        from,
        streamConditions,
        isUnlisted,
        remixOf
      }
    ) => {
      const audiusSdk = await initializeAudiusSdk({ handle: from })
      const userId = await getCurrentUserId()

      await audiusSdk.tracks.updateTrack({
        userId,
        trackId,
        metadata: {
          title,
          tags,
          description,
          mood: mood ? (mood as Mood) : undefined,
          genre: genre ? (genre as Genre) : undefined,
          previewStartSeconds,
          license,
          streamConditions: streamConditions
            ? JSON.parse(streamConditions)
            : undefined,
          isUnlisted,
          remixOf: remixOf ? JSON.parse(remixOf) : undefined
        }
      })
      console.log(chalk.green('Successfully updated track!'))
    }
  )
