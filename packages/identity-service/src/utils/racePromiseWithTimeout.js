const racePromiseWithTimeout = async (
  requestPromise,
  timeoutMs,
  timeoutErrorMsg
) => {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(timeoutErrorMsg)), timeoutMs)
  })
  return Promise.race([requestPromise, timeoutPromise])
}

module.exports = racePromiseWithTimeout
