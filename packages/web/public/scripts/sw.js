/*
*  Push Notifications
*/
/* global clients */

/* eslint-disable max-len */

function readNotificationCampaignId(raw) {
  const target = raw?.data?.data ?? raw?.data ?? raw
  if (!target || typeof target !== 'object') return null
  const v = target.notification_campaign_id
  return typeof v === 'string' && v.length > 0 ? v : null
}

// On Service Worker receiving a push notification.
// eslint-disable-next-line
self.addEventListener('push', function (event) {
  const pushEvent = JSON.parse(event.data.text())

  const options = {
    body: pushEvent.message,
    icon: 'images/icon_72x72.png',
    badge: 'images/icon_192x192.png',
    data: pushEvent
  }

  // eslint-disable-next-line
event.waitUntil(self.registration.showNotification(pushEvent.title, options))
})

// On Notification Click.
// eslint-disable-next-line
self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const campaignId = readNotificationCampaignId(event.notification.data)
  let notificationURL = '/feed?openNotifications=true'
  if (campaignId) {
    notificationURL +=
      '&notificationCampaignId=' + encodeURIComponent(campaignId)
  }
  event.waitUntil(clients.openWindow(notificationURL))
})
