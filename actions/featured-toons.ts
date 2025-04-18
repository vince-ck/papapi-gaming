"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { uploadImageToBlob, deleteImageFromBlob } from "@/lib/blob-utils"
import { type FeaturedToon, FEATURED_TOON_COLLECTION } from "@/models/featured-toon"

// Get all featured toons
export async function getFeaturedToons(): Promise<FeaturedToon[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const featuredToons = await db.collection(FEATURED_TOON_COLLECTION).find({}).sort({ characterClass: 1 }).toArray()

    return JSON.parse(JSON.stringify(featuredToons))
  } catch (error) {
    console.error("Error fetching featured toons:", error)
    throw new Error("Failed to fetch featured toons")
  }
}

// Get a single featured toon by ID
export async function getFeaturedToonById(id: string): Promise<FeaturedToon | null> {
  try {
    const client = await clientPromise
    const db = client.db()

    const featuredToon = await db.collection(FEATURED_TOON_COLLECTION).findOne({ _id: new ObjectId(id) })

    return featuredToon ? JSON.parse(JSON.stringify(featuredToon)) : null
  } catch (error) {
    console.error("Error fetching featured toon:", error)
    throw new Error("Failed to fetch featured toon")
  }
}

// Get a featured toon by character class
export async function getFeaturedToonByClass(characterClass: string): Promise<FeaturedToon | null> {
  try {
    const client = await clientPromise
    const db = client.db()

    const featuredToon = await db.collection(FEATURED_TOON_COLLECTION).findOne({ characterClass })

    return featuredToon ? JSON.parse(JSON.stringify(featuredToon)) : null
  } catch (error) {
    console.error("Error fetching featured toon by class:", error)
    throw new Error("Failed to fetch featured toon")
  }
}

// Create or update a featured toon
export async function saveFeaturedToon(
  formData: FormData,
): Promise<{ success: boolean; message: string; toon?: FeaturedToon }> {
  try {
    const client = await clientPromise
    const db = client.db()

    const id = formData.get("id") as string
    const characterClass = formData.get("characterClass") as string
    const displayName = formData.get("displayName") as string
    const description = formData.get("description") as string
    const imageFile = formData.get("image") as File | null
    const currentImageUrl = formData.get("currentImageUrl") as string

    if (!characterClass || !displayName) {
      return { success: false, message: "Character class and display name are required" }
    }

    let imageUrl = currentImageUrl

    // If a new image was uploaded, process it
    if (imageFile && imageFile.size > 0) {
      // Upload the new image
      imageUrl = await uploadImageToBlob(imageFile)

      // If updating and there's an existing image, delete the old one
      if (id && currentImageUrl) {
        try {
          await deleteImageFromBlob(currentImageUrl)
        } catch (error) {
          console.error("Error deleting old image:", error)
          // Continue even if deletion fails
        }
      }
    }

    const now = new Date()

    // Prepare the toon data
    const toonData: FeaturedToon = {
      characterClass,
      displayName,
      description,
      imageUrl,
      updatedAt: now,
    }

    // Update or create the toon
    if (id) {
      // Update existing toon
      await db.collection(FEATURED_TOON_COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: toonData })

      return {
        success: true,
        message: `${displayName} updated successfully`,
        toon: { ...toonData, _id: id },
      }
    } else {
      // Create new toon
      toonData.createdAt = now

      const result = await db.collection(FEATURED_TOON_COLLECTION).insertOne(toonData)

      return {
        success: true,
        message: `${displayName} created successfully`,
        toon: { ...toonData, _id: result.insertedId },
      }
    }
  } catch (error) {
    console.error("Error saving featured toon:", error)
    return { success: false, message: "Failed to save featured toon" }
  } finally {
    revalidatePath("/admin/featured-toons")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Delete a featured toon
export async function deleteFeaturedToon(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Get the toon to delete its image
    const toon = await db.collection(FEATURED_TOON_COLLECTION).findOne({ _id: new ObjectId(id) })

    if (!toon) {
      return { success: false, message: "Featured toon not found" }
    }

    // Delete the image from Vercel Blob
    if (toon.imageUrl) {
      try {
        await deleteImageFromBlob(toon.imageUrl)
      } catch (error) {
        console.error("Error deleting image:", error)
        // Continue even if image deletion fails
      }
    }

    // Delete the toon from the database
    await db.collection(FEATURED_TOON_COLLECTION).deleteOne({ _id: new ObjectId(id) })

    return { success: true, message: "Featured toon deleted successfully" }
  } catch (error) {
    console.error("Error deleting featured toon:", error)
    return { success: false, message: "Failed to delete featured toon" }
  } finally {
    revalidatePath("/admin/featured-toons")
    revalidatePath("/games/ragnarok-m-classic")
  }
}
