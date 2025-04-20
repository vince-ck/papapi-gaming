import { put } from "@vercel/blob"
import { nanoid } from "nanoid"

// Maximum file size in bytes (1MB)
export const MAX_FILE_SIZE = 1 * 1024 * 1024

/**
 * Compresses an image file to reduce its size
 * @param file The image file to compress
 * @param maxSizeInBytes Maximum size in bytes
 * @returns A promise that resolves to the compressed file
 */
export async function compressImage(file: File, maxSizeInBytes: number = MAX_FILE_SIZE): Promise<File> {
  // If file is already smaller than max size, return it as is
  if (file.size <= maxSizeInBytes) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate the ratio to maintain aspect ratio while reducing size
        let ratio = 1
        if (file.size > maxSizeInBytes) {
          ratio = Math.sqrt(maxSizeInBytes / file.size) * 0.9 // 0.9 to ensure we're under the limit
        }

        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to blob with reduced quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"))
              return
            }

            // Create a new file from the blob
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          file.type,
          0.8, // Quality parameter (0.8 = 80% quality)
        )
      }
      img.onerror = () => {
        reject(new Error("Failed to load image for compression"))
      }
    }
    reader.onerror = () => {
      reject(new Error("Failed to read file for compression"))
    }
  })
}

/**
 * Uploads a file to Vercel Blob storage
 * @param file The file to upload
 * @param folder The folder path within blob storage
 * @returns A promise that resolves to the URL of the uploaded file
 */
export async function uploadToBlob(file: File, folder = "uploads"): Promise<string> {
  try {
    // Compress the image if it's too large
    let fileToUpload = file
    if (file.type.startsWith("image/") && file.size > MAX_FILE_SIZE) {
      fileToUpload = await compressImage(file)
    }

    // Generate a unique filename with the original extension
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `${folder}/${nanoid()}.${fileExtension}`

    // Upload to Vercel Blob
    const { url } = await put(fileName, fileToUpload, {
      access: "public",
    })

    return url
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error)
    throw new Error("Failed to upload file")
  }
}
