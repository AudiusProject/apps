export const ALLOWED_MAX_AUDIO_SIZE_BYTES = 2 * 1000 * 1000 * 1000

export const ALLOWED_AUDIO_FILE_EXTENSIONS = [
  'mp2',
  'mp3',
  // mp4
  'mp4',
  'm4a',
  'm4b',
  'm4r',
  'm4v',
  // wave file extensiosn
  'wav',
  'wave',
  // flac file extensiosn
  'flac',
  // aiff file extensiosn
  'aif',
  'aiff',
  'aifc',
  // Ogg file extensiosn
  'ogg',
  'ogv',
  'oga',
  'ogx',
  'ogm',
  'spx',
  'opus',
  // aac
  '3gp',
  'aac',
  // amr
  'amr',
  '3ga',
  // amrwb
  'awb',
  // xwma
  'xwma',
  // webm
  'webm',
  // mpegts
  'ts',
  'tsv',
  'tsa'
]

// Ogg is a generic container format, so browsers don't always label .ogg
// files as audio: Firefox's built-in extension table gives .ogg the type
// application/ogg (and lists video/ogg for it too), whatever the OS. The
// extension itself is checked separately (ALLOWED_AUDIO_FILE_EXTENSIONS above).
export const ALLOWED_AUDIO_FILE_MIME = /^(audio|video\/ogg|application\/ogg)/
