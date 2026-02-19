import { readFileSync } from 'fs'
import path from 'path'

import type { Track, Playlist } from '@audius/sdk'

const runAgainstLocalStack = process.env.RUN_AGAINST_STAGE !== 'true'

const getData = (filename: string) =>
  JSON.parse(readFileSync(path.resolve('../web/e2e/data/', filename), 'utf8'))
const user = () => getData('user.json')
const track = () => getData('track.json')
const remix = () => getData('remix.json')
const album = () => getData('album.json')[0]
const album2 = () => getData('album2.json')[0]
const playlist = () => getData('playlist.json')[0]
const user2 = () => getData('user2.json')
const track2 = () => getData('track2.json')

export const getUser = () => {
  if (runAgainstLocalStack) {
    const { name } = user()
    const entropy = readFileSync(
      path.resolve('../web/e2e/data/', 'entropy.txt'),
      'utf8'
    )

    return {
      name,
      entropy
    }
  }

  return {
    name: 'probertest',
    entropy: 'bdaba824b6e02ab7868c5a2dfdfc7e9f'
  }
}

export const getTrack = () => {
  if (runAgainstLocalStack) {
    return track() as Pick<Track, 'permalink' | 'title'>
  }

  return {
    permalink: '/sebastian12/bachgavotte-1',
    title: '/probers_track_do_not_delete'
  }
}

export const getTrack2 = () => {
  if (runAgainstLocalStack) {
    const { title, permalink } = track2()

    return {
      url: permalink,
      name: title
    }
  }

  return {
    url: 'sebastian12/bachgavotte-1',
    name: 'probers_track_do_not_delete'
  }
}

export const getRemix = () => {
  if (runAgainstLocalStack) {
    const { title, permalink } = remix()

    return {
      url: permalink,
      name: title
    }
  }

  return {
    // TODO: this track has been deleted and should be replaced
    url: 'df/probers_remix_do_not_delete-2859',
    name: 'probers_remix_do_not_delete'
  }
}

export const getRemixes = () => {
  if (runAgainstLocalStack) {
    const { permalink } = track()

    return {
      url: `${permalink}/remixes`
    }
  }

  return {
    url: 'mb430/traektoria-source-2217/remixes'
  }
}

export const getAlbum = () => {
  if (runAgainstLocalStack) {
    return album() as Pick<Playlist, 'playlistName' | 'permalink'>
  }

  return {
    permalink: '/df/album/probers_album_do_not_delete-512',
    playlistName: 'probers_album_do_not_delete'
  }
}

export const getEditableAlbum = () => {
  if (runAgainstLocalStack) {
    return album2() as Pick<Playlist, 'playlistName' | 'permalink'>
  }

  // TODO: Find one for stage or eliminate stage testing
  return {
    permalink: '',
    playlistName: ''
  }
}

export const getPlaylist = () => {
  if (runAgainstLocalStack) {
    const { playlistName, permalink } = playlist()

    return {
      url: permalink,
      name: playlistName
    }
  }

  return {
    url: 'df/playlist/probers_playlist_do_not_delete-511',
    name: 'PROBERS_PLAYLIST_DO_NOT_DELETE'
  }
}
