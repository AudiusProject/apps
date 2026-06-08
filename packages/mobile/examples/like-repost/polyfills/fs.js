// Minimal fs polyfill for React Native/Expo
const fs = {
  existsSync: () => false,
  createReadStream: () => { throw new Error('File system not supported in Expo Go') },
  readFile: (_p, cb) => { if (cb) cb(new Error('File system not supported')) },
  readFileSync: () => { throw new Error('File system not supported') },
  writeFile: (_p, _d, cb) => { if (cb) cb(new Error('File system not supported')) },
  writeFileSync: () => { throw new Error('File system not supported') },
  stat: (_p, cb) => { if (cb) cb(new Error('File system not supported')) },
  statSync: () => { throw new Error('File system not supported') },
  open: (_p, _f, cb) => { if (cb) cb(new Error('File system not supported')) },
  close: (_fd, cb) => { if (cb) cb(new Error('File system not supported')) },
  read: (_fd, _b, _o, _l, _p, cb) => { if (cb) cb(new Error('File system not supported')) }
}
module.exports = fs
