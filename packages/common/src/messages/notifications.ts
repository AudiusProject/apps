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

const pluralize = (count: number, noun: string) =>
  `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`

export const weeklyArtistRecapNotificationMessages = {
  title: 'Your Week on Audius',
  // e.g. "1,240 plays, 18 new followers, top city Atlanta, 42 saves". Zero
  // followers or saves and a missing city are left out. Same as the push.
  body: ({
    playCount,
    followerCount,
    saveCount,
    topCity
  }: {
    playCount: number
    followerCount: number
    saveCount: number
    topCity?: string
  }) =>
    [
      pluralize(playCount, 'play'),
      followerCount > 0 ? pluralize(followerCount, 'new follower') : null,
      topCity ? `top city ${topCity}` : null,
      saveCount > 0 ? pluralize(saveCount, 'save') : null
    ]
      .filter(Boolean)
      .join(', '),
  rotationSaves: (count: number) =>
    `${count.toLocaleString('en-US')} ${
      count === 1 ? 'save' : 'saves'
    } came from Weekly Rotation listeners.`
}
