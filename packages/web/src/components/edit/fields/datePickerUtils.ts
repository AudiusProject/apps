export const isDateOnOrBeforeToday = (date: Date, now = new Date()) => {
  const selectedDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return selectedDay.getTime() <= today.getTime()
}
