const CURRENT_USER_EXISTS_LOCAL_STORAGE_KEY = require('./constants').CURRENT_USER_EXISTS_LOCAL_STORAGE_KEY

const supportsLocalStorage = () => typeof window !== 'undefined' && window && window.localStorage

/**
 * Singleton class to store the current user if initialized.
 * Some instances of AudiusLibs and services require a current user to
 * return valid queries, e.g. requesting the a discprov to return a reposted track.
 */
class UserStateManager {
  constructor () {
    this.currentUser = null
    if (supportsLocalStorage()) {
      window.localStorage.removeItem(CURRENT_USER_EXISTS_LOCAL_STORAGE_KEY)
    }
  }

  setCurrentUser (currentUser) {
    this.currentUser = currentUser
    if (supportsLocalStorage()) {
      window.localStorage.setItem(CURRENT_USER_EXISTS_LOCAL_STORAGE_KEY, true)
    }
  }

  getCurrentUser () {
    return this.currentUser
  }

  getCurrentUserId () {
    return this.currentUser ? this.currentUser.user_id : null
  }

  clearUser () {
    this.currentUser = null
    if (supportsLocalStorage()) {
      window.localStorage.removeItem(CURRENT_USER_EXISTS_LOCAL_STORAGE_KEY)
    }
  }
}

module.exports = UserStateManager
