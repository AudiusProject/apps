import exclusiveTracksLineupSagas from './lineups/tracks/sagas'

export default function sagas() {
  return [...exclusiveTracksLineupSagas()]
}
