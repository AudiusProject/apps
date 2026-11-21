import { useEffect, useState } from 'react'

export const useFormImageUrl = (imageFile: File | null): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setImageUrl(null)
    }
  }, [imageFile])

  return imageUrl
}
