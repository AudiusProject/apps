const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const HIBP_URL = 'https://api.pwnedpasswords.com/range/'

const API_MIN_MATCH_COUNT = 20

export const commonPasswordCheck = async (
  password: string
): Promise<boolean> => {
  const digest = await window.crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(password)
  )
  const hash = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  // 2 second limit on the API request
  try {
    const result = await Promise.race([
      fetch(`${HIBP_URL}${hash.slice(0, 5)}`),
      sleep(2000)
    ])

    if (result) {
      const text = await result.text()
      const hashArr = text.split(/\s+/g).map((s) => s.slice(0, s.indexOf(':')))

      // If there is no match, return false
      if (!hashArr.includes(hash.slice(5))) {
        return false
      }

      const valString = text.slice(text.indexOf(hash.slice(5))).split(/\s+/g)[0]
      const count = Number(valString.split(':')[1])

      // Return true if match count if above min threshold
      return count >= API_MIN_MATCH_COUNT
    }
  } catch (e) {}
  // Fallback to the common password list if the api does not respond in time
  const commonPasswordList = await import('./passwordListLazyLoader').then(
    (list) => list.commonPasswordList
  )

  return commonPasswordList.test(password) as boolean
}

export const isNotCommonPassword = async (password: string) => {
  if (password.length < 8) {
    return false
  }
  return !(await commonPasswordCheck(password))
}
