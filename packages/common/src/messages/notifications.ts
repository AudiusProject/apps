export const listenStreakReminderMessages = {
  title: 'Keep Your Streak Going!',
  body: (streak: number) =>
    `Your ${streak} day listening streak will end in 6 hours! Keep listening to earn daily rewards!`
}

export const weeklyRotationNotificationMessages = {
  title: 'Your Weekly Rotation Is Ready',
  body: 'A fresh mix of tracks picked just for you. Updates every Wednesday.'
}

const pluralizeRotations = (count: number) =>
  `${count} Weekly Rotation${count === 1 ? '' : 's'}`

export const weeklyRotationFeaturedNotificationMessages = {
  title: 'Featured in Weekly Rotation',
  your: 'Your',
  yourTracks: 'Your tracks',
  featuredIn: (rotationCount: number) =>
    `was featured in ${pluralizeRotations(rotationCount)} last week`,
  tracksFeaturedIn: (rotationCount: number) =>
    `were featured in ${pluralizeRotations(rotationCount)} last week`
}
