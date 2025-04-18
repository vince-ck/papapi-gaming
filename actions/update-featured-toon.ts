"use server"

import { revalidatePath } from "next/cache"

// In a real application, you would store these in a database
// and handle file uploads to a storage service like Vercel Blob
// This is a simplified version for demo purposes

// Mock database of character images
const characterImages = {
  mechanic: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mechanic.jpg-v2kQT6KyJTN5cV4AulkWgeVxgnCilI.jpeg",
  royal_guard:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/royal_guard.jpg-F8wfTpS7xlttLSBr14qCw8aO0BibSE.jpeg",
}

export async function updateFeaturedToon(formData: FormData) {
  try {
    const characterClass = formData.get("characterClass") as string
    const imageUrl = formData.get("imageUrl") as string

    if (!characterClass || !imageUrl) {
      return { success: false, error: "Missing required fields" }
    }

    if (!characterImages.hasOwnProperty(characterClass)) {
      return { success: false, error: "Invalid character class" }
    }

    // Update the image URL
    characterImages[characterClass as keyof typeof characterImages] = imageUrl

    // Revalidate the path to update the UI
    revalidatePath("/games/ragnarok-m-classic")

    return {
      success: true,
      message: `${characterClass.charAt(0).toUpperCase() + characterClass.slice(1)} image updated successfully`,
    }
  } catch (error) {
    console.error("Error updating featured toon:", error)
    return { success: false, error: "Failed to update image" }
  }
}

export async function getFeaturedToonImages() {
  return characterImages
}
