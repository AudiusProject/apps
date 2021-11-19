const Setup = require('./setup')

const { LibsWrapper, Utils } = require('./libs')

// Any method you add in these commands files will be automatically imported
// and accessible via ServiceCommands
const User = require('./commands/users')
const Track = require('./commands/tracks')
const File = require('./commands/files')
const IpldBlacklist = require('./commands/ipldBlacklist')
const Playlist = require('./commands/playlists')
const DataContracts = require('./commands/dataContracts')
const Seed = require('./commands/seed')

module.exports = {
  LibsWrapper,
  Utils,
  ...Setup,
  ...User,
  ...Track,
  ...File,
  ...IpldBlacklist,
  ...Playlist,
  ...DataContracts,
  Seed
}
