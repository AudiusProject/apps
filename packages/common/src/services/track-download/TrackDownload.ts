import { Dispatch } from 'redux'

export type DownloadFile = { url: string; filename: string }

export type DownloadTrackArgs = {
  files: DownloadFile[]
  rootDirectoryName?: string
  abortSignal?: AbortSignal
  dispatch: Dispatch
}

export type DownloadFileArgs = {
  file: DownloadFile
  mimeType?: string
  abortSignal?: AbortSignal
}

export class TrackDownload {
  async downloadTracks(_args: DownloadTrackArgs) {
    throw new Error('downloadTrack not implemented')
  }

  async downloadFile(_args: DownloadFileArgs) {
    throw new Error('downloadFile not implemented')
  }
}
