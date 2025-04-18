import { put, del } from "@vercel/blob"
import { nanoid } from "nanoid"

export async function uploadImageToBlob(file: File): Promise<string> {
  try {
    // Generate a unique filename with the original extension
    const fileExtension = file.name.split(".").pop()
    const fileName = `${nanoid()}.${fileExtension}`

    // Upload to Vercel Blob
    const { url } = await put(`featured-toons/${fileName}`, file, {
      access: "public",
    })

    return url
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error)
    throw new Error("Failed to upload image")
  }
}

export async function deleteImageFromBlob(url: string): Promise<void> {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    // Delete from Vercel Blob
    await del(pathname)
  } catch (error) {
    console.error("Error deleting from Vercel Blob:", error)
    throw new Error("Failed to delete image")
  }
}
