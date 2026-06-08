// Minimal fs polyfill for React Native/Expo Go (from mobile-devkit)
// Provides stubs for methods required by SDK dependencies (e.g. strtok3 via file-type)
// Actual file operations are not supported in Expo Go

const fs = {
  existsSync: () => false,
  createReadStream: () => {
    throw new Error('File system operations not supported in Expo Go')
  },
  readFile: (_path, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  },
  readFileSync: () => {
    throw new Error('File system operations not supported in Expo Go')
  },
  writeFile: (_path, _data, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  },
  writeFileSync: () => {
    throw new Error('File system operations not supported in Expo Go')
  },
  stat: (_path, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  },
  statSync: () => {
    throw new Error('File system operations not supported in Expo Go')
  },
  open: (_path, _flags, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  },
  close: (_fd, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  },
  read: (_fd, _buffer, _offset, _length, _position, callback) => {
    if (callback) {
      callback(new Error('File system operations not supported in Expo Go'))
    }
  }
}

module.exports = fs
