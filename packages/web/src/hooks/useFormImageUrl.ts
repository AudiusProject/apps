import { useEffect, useState } from 'react'

/**
 * Hook for managing blob URLs from form image files.
 * Handles creation and cleanup of object URLs for previewing images.
 *
 * @param imageFile - The File object to create a URL for, or null
 * @returns The blob URL string or null if no file is provided
 */
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
