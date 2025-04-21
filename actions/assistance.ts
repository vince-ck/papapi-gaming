"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import {
  type AssistanceType,
  type Booking,
  ASSISTANCE_TYPES_COLLECTION,
  BOOKINGS_COLLECTION,
} from "@/models/assistance"

// Helper function to generate a request number
function generateRequestNumber(characterId: string): string {
  const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0") // 3-digit random number
  return `REQ-${characterId}-${timestamp}${randomPart}`
}

// Get all active assistance types
export async function getAssistanceTypes(): Promise<AssistanceType[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const assistanceTypes = await db
      .collection(ASSISTANCE_TYPES_COLLECTION)
      .find({ isActive: true })
      .sort({ listOrder: 1 }) // Sort by listOrder instead of name
      .toArray()

    return JSON.parse(JSON.stringify(assistanceTypes))
  } catch (error) {
    console.error("Error fetching assistance types:", error)
    throw new Error("Failed to fetch assistance types")
  }
}

// Check if a duplicate booking exists
export async function checkDuplicateBooking(characterId: string, assistanceTypeId: string): Promise<boolean> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Find any active bookings (not cancelled) with the same character ID and assistance type
    const existingBooking = await db.collection(BOOKINGS_COLLECTION).findOne({
      characterId,
      assistanceTypeId: new ObjectId(assistanceTypeId),
      status: { $ne: "cancelled" }, // Not equal to cancelled
    })

    // Return true if a duplicate exists
    return !!existingBooking
  } catch (error) {
    console.error("Error checking for duplicate booking:", error)
    // In case of error, assume no duplicate to avoid blocking legitimate requests
    return false
  }
}

// Update the createBooking function to better handle requests with disabled scheduling
export async function createBooking(formData: FormData): Promise<{
  success: boolean
  message: string
  booking?: Partial<Booking>
  requestNumber?: string
  isDuplicate?: boolean
}> {
  try {
    const client = await clientPromise
    const db = client.db()

    const characterId = formData.get("characterId") as string
    const contactInfo = formData.get("contactInfo") as string
    const assistanceTypeId = formData.get("assistanceTypeId") as string
    const additionalInfo = formData.get("additionalInfo") as string

    // These might be empty for assistance types with scheduling disabled
    const startDateTime = formData.get("startDateTime") ? new Date(formData.get("startDateTime") as string) : new Date()
    const endDateTime = formData.get("endDateTime")
      ? new Date(formData.get("endDateTime") as string)
      : new Date(Date.now() + 3600000)

    // Get photo URLs from JSON string
    const photoUrlsJson = formData.get("photoUrls") as string
    let photoUrls = []
    try {
      if (photoUrlsJson) {
        photoUrls = JSON.parse(photoUrlsJson)
      }
    } catch (error) {
      console.error("Error parsing photo URLs:", error)
      // Continue with empty array if parsing fails
    }

    // Get new fields from the form
    let selectedDays = []
    try {
      const selectedDaysJson = formData.get("selectedDays") as string
      if (selectedDaysJson) {
        selectedDays = JSON.parse(selectedDaysJson)
      }
    } catch (error) {
      console.error("Error parsing selected days:", error)
      // Continue with empty array if parsing fails
    }

    const timeRangePreset = (formData.get("timeRangePreset") as "early" | "middle" | "late" | "custom") || "early"
    const startTime = (formData.get("startTime") as string) || ""
    const endTime = (formData.get("endTime") as string) || ""
    const slots = Number.parseInt((formData.get("slots") as string) || "1", 10)
    const willingToDonate = (formData.get("willingToDonate") as "yes" | "no") || "no"

    // Validate required fields
    // Check for empty strings as well as undefined/null values
    if (!characterId?.trim() || !contactInfo?.trim() || !assistanceTypeId?.trim() || !additionalInfo?.trim()) {
      console.log("Missing or empty fields:", {
        characterId: !characterId?.trim(),
        contactInfo: !contactInfo?.trim(),
        assistanceTypeId: !assistanceTypeId?.trim(),
        additionalInfo: !additionalInfo?.trim(),
      })

      // Provide more specific error message
      if (!characterId?.trim()) return { success: false, message: "Character ID is required" }
      if (!contactInfo?.trim()) return { success: false, message: "Contact information is required" }
      if (!assistanceTypeId?.trim()) return { success: false, message: "Please select an assistance type" }
      if (!additionalInfo?.trim()) return { success: false, message: "Additional information is required" }

      return { success: false, message: "All required fields must be provided" }
    }

    // Also ensure the assistanceTypeId is a valid ObjectId
    try {
      new ObjectId(assistanceTypeId)
    } catch (error) {
      return { success: false, message: "Invalid assistance type selected" }
    }

    // Validate character ID is numeric
    if (!/^\d+$/.test(characterId)) {
      return { success: false, message: "Character ID must contain only numbers" }
    }

    // Check for duplicate booking
    const isDuplicate = await checkDuplicateBooking(characterId, assistanceTypeId)
    if (isDuplicate) {
      return {
        success: false,
        message:
          "You already have an active request for this assistance type. Please wait until it's completed or cancelled before requesting again.",
        isDuplicate: true,
      }
    }

    // Get assistance type name for reference
    const assistanceType = await db
      .collection(ASSISTANCE_TYPES_COLLECTION)
      .findOne({ _id: new ObjectId(assistanceTypeId) })

    if (!assistanceType) {
      return { success: false, message: "Invalid assistance type selected" }
    }

    const now = new Date()

    // Generate a unique request number
    const requestNumber = generateRequestNumber(characterId)

    // Check if scheduling is disabled for this assistance type
    const isSchedulingDisabled = assistanceType.allowSchedule === false

    // Replace the existing startDateTime and endDateTime in the booking object
    const booking: Booking = {
      requestNumber,
      characterId,
      contactInfo,
      // Store assistanceTypeId as a string instead of ObjectId to avoid serialization issues
      assistanceTypeId: assistanceTypeId,
      assistanceTypeName: assistanceType.name,
      additionalInfo,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,

      // New fields - use empty or default values if scheduling is disabled
      selectedDays: isSchedulingDisabled ? [] : selectedDays,
      timeRangePreset: isSchedulingDisabled ? "early" : timeRangePreset,
      startTime: isSchedulingDisabled ? undefined : startTime || undefined,
      endTime: isSchedulingDisabled ? undefined : endTime || undefined,
      slots: isSchedulingDisabled ? 1 : slots,
      willingToDonate,

      // Legacy fields
      startDateTime: startDateTime || now,
      endDateTime: endDateTime || new Date(now.getTime() + 3600000),

      status: "pending",
      createdAt: now,
      updatedAt: now,
    }

    // For database insertion, convert the assistanceTypeId back to ObjectId
    const dbBooking = {
      ...booking,
      assistanceTypeId: new ObjectId(assistanceTypeId),
    }

    // Insert booking into database
    const result = await db.collection(BOOKINGS_COLLECTION).insertOne(dbBooking)

    // Return a sanitized version of the booking object without any ObjectId instances
    // Use a new object to avoid modifying the original
    const sanitizedBooking = {
      ...booking,
      _id: result.insertedId.toString(),
    }

    return {
      success: true,
      message: "Booking created successfully",
      booking: sanitizedBooking,
      requestNumber,
    }
  } catch (error) {
    console.error("Error creating booking:", error)
    return { success: false, message: "Failed to create booking" }
  } finally {
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Get all bookings
export async function getBookings(): Promise<Booking[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const bookings = await db.collection(BOOKINGS_COLLECTION).find({}).sort({ createdAt: -1 }).toArray()

    // Convert to plain objects to ensure no ObjectId instances are returned
    return JSON.parse(JSON.stringify(bookings))
  } catch (error) {
    console.error("Error fetching bookings:", error)
    throw new Error("Failed to fetch bookings")
  }
}

// Initialize default assistance types if none exist
export async function initializeAssistanceTypes(): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Check if assistance types already exist
    const count = await db.collection(ASSISTANCE_TYPES_COLLECTION).countDocuments()

    if (count === 0) {
      // Insert default assistance types with listOrder
      const defaultTypes: AssistanceType[] = [
        {
          name: "Leveling Assistance",
          description: "Help with power leveling your character",
          isActive: true,
          listOrder: 1,
          allowPhotoUpload: false,
          allowSchedule: true,
        },
        {
          name: "Boss Hunting",
          description: "Assistance with defeating MVP or mini-boss monsters",
          isActive: true,
          listOrder: 2,
          allowPhotoUpload: true, // Enable photo uploads for boss hunting
          allowSchedule: true,
        },
        {
          name: "Quest Completion",
          description: "Help completing difficult quests or missions",
          isActive: true,
          listOrder: 3,
          allowPhotoUpload: true, // Enable photo uploads for quest completion
          allowSchedule: true,
        },
        {
          name: "Item Farming",
          description: "Assistance with farming specific items or materials",
          isActive: true,
          listOrder: 4,
          allowPhotoUpload: false,
          allowSchedule: true,
        },
        {
          name: "Build Consultation",
          description: "Expert advice on character builds and skill allocation",
          isActive: true,
          listOrder: 5,
          allowPhotoUpload: false,
          allowSchedule: false, // Disable scheduling for consultation
        },
        {
          name: "Equipment Enhancement",
          description: "Help with upgrading and enhancing equipment",
          isActive: true,
          listOrder: 6,
          allowPhotoUpload: true, // Enable photo uploads for equipment enhancement
          allowSchedule: false, // Disable scheduling for enhancement
        },
      ]

      await db.collection(ASSISTANCE_TYPES_COLLECTION).insertMany(defaultTypes)
    } else {
      // Update existing assistance types to add listOrder and allowPhotoUpload if they don't exist
      const assistanceTypes = await db.collection(ASSISTANCE_TYPES_COLLECTION).find({}).toArray()

      for (let i = 0; i < assistanceTypes.length; i++) {
        const type = assistanceTypes[i]
        const updates: Partial<AssistanceType> = {}

        if (type.listOrder === undefined) {
          updates.listOrder = i + 1
        }

        if (type.allowPhotoUpload === undefined) {
          // Default to false for existing types
          updates.allowPhotoUpload = false
        }

        if (type.allowSchedule === undefined) {
          // Default to true for existing types
          updates.allowSchedule = true
        }

        if (Object.keys(updates).length > 0) {
          await db.collection(ASSISTANCE_TYPES_COLLECTION).updateOne({ _id: type._id }, { $set: updates })
        }
      }
    }
  } catch (error) {
    console.error("Error initializing assistance types:", error)
  }
}

// Add a function to update the listOrder of an assistance type
export async function updateAssistanceTypeOrder(
  id: string,
  newOrder: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Validate the ID
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return { success: false, message: "Invalid assistance type ID" }
    }

    // Update the listOrder
    await db.collection(ASSISTANCE_TYPES_COLLECTION).updateOne({ _id: objectId }, { $set: { listOrder: newOrder } })

    return { success: true, message: "Assistance type order updated successfully" }
  } catch (error) {
    console.error("Error updating assistance type order:", error)
    return { success: false, message: "Failed to update assistance type order" }
  } finally {
    revalidatePath("/admin/assistance-types")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Add this function to toggle the allowPhotoUpload flag
export async function toggleAssistanceTypePhotoUpload(
  id: string,
  allowPhotoUpload: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Validate the ID
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return { success: false, message: "Invalid assistance type ID" }
    }

    // Update the allowPhotoUpload flag
    await db.collection(ASSISTANCE_TYPES_COLLECTION).updateOne({ _id: objectId }, { $set: { allowPhotoUpload } })

    return {
      success: true,
      message: `Photo uploads ${allowPhotoUpload ? "enabled" : "disabled"} successfully`,
    }
  } catch (error) {
    console.error("Error updating assistance type photo upload setting:", error)
    return { success: false, message: "Failed to update photo upload setting" }
  } finally {
    revalidatePath("/admin/assistance-types")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Add this function to toggle the allowSchedule flag
export async function toggleAssistanceTypeSchedule(
  id: string,
  allowSchedule: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Validate the ID
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return { success: false, message: "Invalid assistance type ID" }
    }

    // Update the allowSchedule flag
    await db.collection(ASSISTANCE_TYPES_COLLECTION).updateOne({ _id: objectId }, { $set: { allowSchedule } })

    return {
      success: true,
      message: `Scheduling ${allowSchedule ? "enabled" : "disabled"} successfully`,
    }
  } catch (error) {
    console.error("Error updating assistance type schedule setting:", error)
    return { success: false, message: "Failed to update schedule setting" }
  } finally {
    revalidatePath("/admin/assistance-types")
    revalidatePath("/games/ragnarok-m-classic")
  }
}
