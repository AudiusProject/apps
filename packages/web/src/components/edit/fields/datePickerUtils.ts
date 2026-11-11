/** Compare local calendar dates so tomorrow is never allowed by a rolling 24-hour window. */
export const isDateOnOrBeforeToday = (date: Date, now = new Date()) => {
  const selectedDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return selectedDay.getTime() <= today.getTime()
}
