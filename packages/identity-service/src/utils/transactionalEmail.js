// Security emails carry codes and login links, so SendGrid must not rewrite links or add pixels.
const DISABLE_TRACKING = {
  clickTracking: { enable: false, enableText: false },
  openTracking: { enable: false }
}

module.exports = { DISABLE_TRACKING }
