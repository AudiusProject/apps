module.exports = {
  assets: ['./src/assets/fonts'],
  dependencies: {
    // Its prebuilt Android library logs the password. Android uses
    // AudiusScrypt instead (see createPrivateKey).
    'react-native-fast-crypto': {
      platforms: { android: null }
    }
  }
}
