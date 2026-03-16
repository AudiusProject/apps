import { randomBytes } from 'crypto'
import { createReadStream, type ReadStream } from 'fs'
import { spawn } from 'child_process'

import chalk from 'chalk'

import {
  createRandomImage,
  getCurrentUserId,
  initializeAudiusSdk,
  parseBoolean
} from '../utils.js'
import { decodeHashId, type Genre, type Mood, type AudiusSdkWithServices } from '@audius/sdk/services'
import { Command, Option } from '@commander-js/extra-typings'
import { outputFormatOption } from '../common-options.js'

function readStreamToBuffer(stream: ReadStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = []

    stream.on('data', (chunk) => {
      chunks.push(Uint8Array.from(chunk as Buffer))
    })

    stream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    stream.on('error', (err) => {
      reject(err)
    })

    stream.on('close', () => {
      if (stream.readableEnded) {
        resolve(Buffer.concat(chunks))
      }
    })
  })
}

function generateWhiteNoise(duration: number, outFile: string) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-f', // audio/video filtering framework
      'lavfi', // provides generic audio filtering for audio/video signals
      '-i', // input flag
      `anoisesrc=d=${duration}`, // generate a noise audio signal for the duration
      outFile, // output filepath
      '-y' // overwrite existing file
    ])

    let error = ''

    process.stderr.on('data', (data) => {
      error += data
    })
    process.on('close', (returncode) => {
      if (returncode !== 0) {
        reject(new Error(`Failed to generate white noise: ${error}`))
      } else {
        resolve()
      }
    })
  })
}

const getStreamConditions = async ({
  userId,
  streamConditions,
  price: priceString,
  audiusSdk
}: {
  userId: string
  streamConditions: any
  price?: string
  audiusSdk: AudiusSdkWithServices
}) => {
  if (priceString) {
    const price = Number.parseInt(priceString)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price "${priceString}"`)
    }
    const { userBank } =
      await audiusSdk.services.claimableTokensClient.getOrCreateUserBank({
        mint: 'USDC'
      })
    return {
      usdcPurchase: {
        price,
        splits: [{ user_id: decodeHashId(userId), percentage: 100 }]
      }
    }
  } else if (streamConditions) {
    return JSON.parse(streamConditions)
  }
  return null
}

const getDownloadConditions = async ({
  userId,
  streamConditions,
  parsedStreamConditions,
  downloadConditions,
  downloadPrice: downloadPriceString,
  audiusSdk
}: {
  userId: string
  streamConditions: any
  parsedStreamConditions: any
  downloadConditions: any
  downloadPrice?: string
  audiusSdk: AudiusSdkWithServices
}) => {
  if (streamConditions) {
    return JSON.parse(streamConditions)
  }
  if (parsedStreamConditions) {
    return parsedStreamConditions
  }
  if (downloadConditions) {
    return JSON.parse(downloadConditions)
  }
  if (downloadPriceString) {
    const price = Number.parseInt(downloadPriceString)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price "${downloadPriceString}"`)
    }
    const { userBank } =
      await audiusSdk.services.claimableTokensClient.getOrCreateUserBank({
        mint: 'USDC'
      })
    return {
      usdcPurchase: {
        price,
        splits: [{ user_id: decodeHashId(userId), percentage: 100 }]
      }
    }
  }
  return null
}

const randomMood = () => {
  return Mood.AGGRESSIVE
}

const randomGenre = () => {
  return Genre.ACOUSTIC
}

export const uploadTrackCommand = new Command('upload')
  .description('Upload a new track')
  .argument(
    '[track]',
    'track to upload (can be :/path/to/track or %<size>m)',
    '%1m'
  )
  .option(
    '-t, --title <title>',
    'Title of track (chosen randomly if not specified)'
  )
  .option('-a, --tags <tags>', 'Tags of track', (arg) => arg.split(','))
  .option(
    '-d, --description <description>',
    'Description of track (chosen randomly if not specified)'
  )
  .option(
    '-m, --mood <mood>',
    'Mood of track (chosen randomly if not specified)',
    (arg) => arg as Mood
  )
  .option(
    '-g, --genre <genre>',
    'Genre of track (chosen randomly if not specified)',
    (arg) => arg as Genre
  )
  .option(
    '-s, --preview-start-seconds <seconds>',
    'Track preview start time (seconds)',
    parseInt
  )
  .option('-l, --license <license>', 'License of track')
  .option('-f, --from <from>', 'The account to upload track from')
  .option(
    '-u, --price <price>',
    'Generate a stream conditions object with the given price in cents. Cannot be used with -r'
  )
  .option(
    '-r, --stream-conditions <stream conditions>',
    'Manually set a stream conditions object. Cannot be used with -u',
    ''
  )
  .option(
    '-dl, --is-downloadable [is downloadable]',
    'Whether track is downloadable',
    parseBoolean
  )
  .option(
    '-dp, --download-price <download price>',
    'Generate a download conditions object with the given price in cents. Cannot be used with -dc'
  )
  .option(
    '-dc, --download-conditions <download conditions>',
    'Manually set a download conditions object. Cannot be used with -dp'
  )
  .option(
    '--remix-of <remix-of>',
    'Specify the track ID of the original track if this is a remix'
  )
  .option(
    '-h, --is-unlisted [isUnlisted]',
    'Whether the track is hidden from the feed (ie. is unlisted)',
    parseBoolean
  )
  .addOption(outputFormatOption)
  .action(async (track, options) => {
    const rand = randomBytes(2).toString('hex').padStart(4, '0').toUpperCase()
    const {
      title = `Track ${rand}`,
      tags,
      description = `Created with audius-cmd ${rand}`,
      mood = randomMood(),
      genre = randomGenre(),
      previewStartSeconds,
      license,
      from,
      price,
      streamConditions,
      isDownloadable,
      downloadPrice,
      downloadConditions,
      remixOf,
      isUnlisted
    } = options

    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    let trackStream
    if (track.startsWith('%')) {
      // %filesize
      const match = track.match(/%(\d+)(.*)/)!
      let size = parseInt(match[1])
      let unit = match[2]
      if (unit === 'm') {
        size *= 1024 * 1024
      } else if (unit === 'k') {
        size *= 1024
      } else {
        throw new Error(`Unknown unit "${unit}"`)
      }

      await generateWhiteNoise(size / 8064, '/tmp/audius-cmd.mp3')
      trackStream = createReadStream('/tmp/audius-cmd.mp3')
    } else if (track.startsWith(':')) {
      // :/path/to/track
      trackStream = createReadStream(track.slice(1))
    } else {
      throw new Error(`Failed to parse track "${track}"`)
    }

    const parsedStreamConditions = await getStreamConditions({
      userId,
      streamConditions,
      price,
      audiusSdk
    })
    const parsedDownloadConditions = await getDownloadConditions({
      userId,
      streamConditions,
      parsedStreamConditions,
      downloadConditions,
      downloadPrice,
      audiusSdk
    })

    const metadata = await audiusSdk.tracks.uploadTrack({
      userId,
      coverArtFile: { buffer: createRandomImage(), name: 'coverart' },
      trackFile: { buffer: await readStreamToBuffer(trackStream) },
      metadata: {
        title,
        description,
        genre,
        mood,
        license,
        isStreamGated: !!parsedStreamConditions,
        isDownloadGated: !!parsedDownloadConditions,
        downloadConditions: parsedDownloadConditions,
        streamConditions: parsedStreamConditions,
        tags: tags?.join(','),
        previewStartSeconds,
        isDownloadable,
        remixOf: remixOf ? { tracks: [{ parentTrackId: remixOf }] } : undefined,
        isUnlisted
      }
    })
    const { trackId } = metadata

    if (options.output === 'json') {
      console.log(JSON.stringify(metadata))
    } else {
      console.log(options.output)
      console.log(chalk.green('Successfully uploaded track!'))
      console.log(chalk.yellow.bold('Track ID:   '), trackId)
      console.log(chalk.yellow.bold('Track ID #: '), decodeHashId(trackId!))
    }
  })
