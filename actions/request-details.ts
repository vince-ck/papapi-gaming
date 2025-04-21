"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { BOOKINGS_COLLECTION, ASSISTANCE_TYPES_COLLECTION } from "@/models/assistance"
import type { Booking, AssistanceType } from "@/models/assistance"

// Get a specific booking by ID
export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    if (!id || id.trim() === "") {
      return null
    }

    const client = await clientPromise
    const db = client.db()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error("Invalid ObjectId:", error)
      return null
    }

    const booking = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    if (!booking) {
      return null
    }

    // Convert to plain object to ensure no ObjectId instances are returned
    return JSON.parse(JSON.stringify(booking))
  } catch (error) {
    console.error("Error fetching booking:", error)
    return null
  }
}

// Get multiple bookings by their IDs
export async function getBookingsByIds(ids: string[]): Promise<Booking[]> {
  try {
    if (!ids || ids.length === 0) {
      return []
    }

    const client = await clientPromise
    const db = client.db()

    // Convert string IDs to ObjectIds
    const objectIds = ids
      .map((id) => {
        try {
          return new ObjectId(id)
        } catch (error) {
          console.error(`Invalid ObjectId: ${id}`, error)
          return null
        }
      })
      .filter((id) => id !== null) as ObjectId[]

    if (objectIds.length === 0) {
      return []
    }

    // Query for all bookings with the given IDs
    const bookings = await db
      .collection(BOOKINGS_COLLECTION)
      .find({ _id: { $in: objectIds } })
      .toArray()

    // Convert to plain objects to ensure no ObjectId instances are returned
    return JSON.parse(JSON.stringify(bookings))
  } catch (error) {
    console.error("Error fetching bookings by IDs:", error)
    return []
  }
}

// Update a booking
export async function updateBooking(
  id: string,
  updates: Partial<Booking>,
): Promise<{ success: boolean; message: string; booking?: Booking }> {
  try {
    if (!id || id.trim() === "") {
      return { success: false, message: "Invalid booking ID" }
    }

    const client = await clientPromise
    const db = client.db()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error("Invalid ObjectId:", error)
      return { success: false, message: "Invalid booking ID format" }
    }

    // Get the current booking to check its status
    const currentBooking = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    if (!currentBooking) {
      return { success: false, message: "Booking not found" }
    }

    // Only allow updates if the booking is in pending status
    if (currentBooking.status !== "pending") {
      return {
        success: false,
        message: `Cannot update booking with status "${currentBooking.status}". Only pending bookings can be updated.`,
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    // Don't allow updating certain fields
    delete updateData._id
    delete updateData.requestNumber
    delete updateData.createdAt
    delete updateData.status // Status should be updated through specific actions

    // If assistanceTypeId is being updated, ensure it's a valid ObjectId
    if (updateData.assistanceTypeId) {
      try {
        updateData.assistanceTypeId = new ObjectId(updateData.assistanceTypeId as string)

        // Get the assistance type name
        const assistanceType = await db
          .collection(ASSISTANCE_TYPES_COLLECTION)
          .findOne({ _id: updateData.assistanceTypeId })

        if (assistanceType) {
          updateData.assistanceTypeName = assistanceType.name
        }
      } catch (error) {
        return { success: false, message: "Invalid assistance type ID" }
      }
    }

    // Update the booking
    const result = await db.collection(BOOKINGS_COLLECTION).updateOne({ _id: objectId }, { $set: updateData })

    if (result.matchedCount === 0) {
      return { success: false, message: "Booking not found" }
    }

    // Get the updated booking
    const updatedBooking = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    // Convert to plain object
    const sanitizedBooking = JSON.parse(JSON.stringify(updatedBooking))

    return {
      success: true,
      message: "Booking updated successfully",
      booking: sanitizedBooking,
    }
  } catch (error) {
    console.error("Error updating booking:", error)
    return { success: false, message: "Failed to update booking" }
  } finally {
    revalidatePath("/request/[id]")
    revalidatePath("/games/ragnarok-m-classic")
    revalidatePath("/recent")
  }
}

// Cancel a booking
export async function cancelBooking(id: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!id || id.trim() === "") {
      return { success: false, message: "Invalid booking ID" }
    }

    const client = await clientPromise
    const db = client.db()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error("Invalid ObjectId:", error)
      return { success: false, message: "Invalid booking ID format" }
    }

    // Get the current booking to check its status
    const currentBooking = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    if (!currentBooking) {
      return { success: false, message: "Booking not found" }
    }

    // Only allow cancellation if the booking is in pending or confirmed status
    if (currentBooking.status !== "pending" && currentBooking.status !== "confirmed") {
      return {
        success: false,
        message: `Cannot cancel booking with status "${currentBooking.status}". Only pending or confirmed bookings can be cancelled.`,
      }
    }

    // Update the booking status to cancelled
    const result = await db.collection(BOOKINGS_COLLECTION).updateOne(
      { _id: objectId },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return { success: false, message: "Booking not found" }
    }

    return { success: true, message: "Booking cancelled successfully" }
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return { success: false, message: "Failed to cancel booking" }
  } finally {
    revalidatePath("/request/[id]")
    revalidatePath("/games/ragnarok-m-classic")
    revalidatePath("/recent")
  }
}

// Delete a booking (only allowed for cancelled bookings)
export async function deleteBooking(id: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!id || id.trim() === "") {
      return { success: false, message: "Invalid booking ID" }
    }

    const client = await clientPromise
    const db = client.db()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error("Invalid ObjectId:", error)
      return { success: false, message: "Invalid booking ID format" }
    }

    // Get the current booking to check its status
    const currentBooking = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    if (!currentBooking) {
      return { success: false, message: "Booking not found" }
    }

    // Only allow deletion if the booking is in cancelled status
    if (currentBooking.status !== "cancelled") {
      return {
        success: false,
        message: `Cannot delete booking with status "${currentBooking.status}". Only cancelled bookings can be deleted.`,
      }
    }

    // Delete the booking
    const result = await db.collection(BOOKINGS_COLLECTION).deleteOne({ _id: objectId })

    if (result.deletedCount === 0) {
      return { success: false, message: "Failed to delete booking" }
    }

    return { success: true, message: "Booking deleted successfully" }
  } catch (error) {
    console.error("Error deleting booking:", error)
    return { success: false, message: "Failed to delete booking" }
  } finally {
    revalidatePath("/request/[id]")
    revalidatePath("/games/ragnarok-m-classic")
    revalidatePath("/recent")
  }
}

// Get all assistance types (for editing)
export async function getAllAssistanceTypes(): Promise<AssistanceType[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const assistanceTypes = await db
      .collection(ASSISTANCE_TYPES_COLLECTION)
      .find({ isActive: true })
      .sort({ listOrder: 1 })
      .toArray()

    return JSON.parse(JSON.stringify(assistanceTypes))
  } catch (error) {
    console.error("Error fetching assistance types:", error)
    return []
  }
}
