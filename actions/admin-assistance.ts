"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { BOOKINGS_COLLECTION } from "@/models/assistance"
import type { Booking } from "@/models/assistance"

// Get all assistance requests for admin
export async function getAllAssistanceRequests(): Promise<Booking[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const requests = await db.collection(BOOKINGS_COLLECTION).find({}).sort({ createdAt: -1 }).toArray()

    // Convert to plain objects to ensure no ObjectId instances are returned
    return JSON.parse(JSON.stringify(requests))
  } catch (error) {
    console.error("Error fetching assistance requests:", error)
    throw new Error("Failed to fetch assistance requests")
  }
}

// Update request status
export async function updateRequestStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
): Promise<{ success: boolean; message: string }> {
  try {
    if (!id || id.trim() === "") {
      return { success: false, message: "Invalid request ID" }
    }

    const client = await clientPromise
    const db = client.db()

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      console.error("Invalid ObjectId:", error)
      return { success: false, message: "Invalid request ID format" }
    }

    // Get the current request to check if it exists
    const currentRequest = await db.collection(BOOKINGS_COLLECTION).findOne({ _id: objectId })

    if (!currentRequest) {
      return { success: false, message: "Request not found" }
    }

    // Update the request status
    const result = await db.collection(BOOKINGS_COLLECTION).updateOne(
      { _id: objectId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return { success: false, message: "Request not found" }
    }

    return {
      success: true,
      message: `Request status updated to ${status} successfully`,
    }
  } catch (error) {
    console.error("Error updating request status:", error)
    return { success: false, message: "Failed to update request status" }
  } finally {
    revalidatePath("/admin/assistance-requests")
    revalidatePath("/request/[id]")
    revalidatePath("/recent")
  }
}

// Bulk update request status
export async function bulkUpdateRequestStatus(
  ids: string[],
  status: "pending" | "confirmed" | "completed" | "cancelled",
): Promise<{ success: boolean; message: string; updatedCount: number }> {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, message: "No request IDs provided", updatedCount: 0 }
    }

    const client = await clientPromise
    const db = client.db()

    // Convert string IDs to ObjectIds, filtering out any invalid ones
    const objectIds = ids
      .map((id) => {
        try {
          return new ObjectId(id)
        } catch (error) {
          console.error(`Invalid ObjectId: ${id}`, error)
          return null
        }
      })
      .filter((id): id is ObjectId => id !== null)

    if (objectIds.length === 0) {
      return { success: false, message: "No valid request IDs provided", updatedCount: 0 }
    }

    // Update the request status for all selected IDs
    const result = await db.collection(BOOKINGS_COLLECTION).updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    )

    return {
      success: true,
      message: `${result.modifiedCount} requests updated to ${status} successfully`,
      updatedCount: result.modifiedCount,
    }
  } catch (error) {
    console.error("Error bulk updating request status:", error)
    return { success: false, message: "Failed to update request status", updatedCount: 0 }
  } finally {
    revalidatePath("/admin/assistance-requests")
    revalidatePath("/request/[id]")
    revalidatePath("/recent")
  }
}

// Bulk delete requests
export async function bulkDeleteRequests(
  ids: string[],
): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, message: "No request IDs provided", deletedCount: 0 }
    }

    const client = await clientPromise
    const db = client.db()

    // Convert string IDs to ObjectIds, filtering out any invalid ones
    const objectIds = ids
      .map((id) => {
        try {
          return new ObjectId(id)
        } catch (error) {
          console.error(`Invalid ObjectId: ${id}`, error)
          return null
        }
      })
      .filter((id): id is ObjectId => id !== null)

    if (objectIds.length === 0) {
      return { success: false, message: "No valid request IDs provided", deletedCount: 0 }
    }

    // Delete the requests
    const result = await db.collection(BOOKINGS_COLLECTION).deleteMany({ _id: { $in: objectIds } })

    return {
      success: true,
      message: `${result.deletedCount} requests deleted successfully`,
      deletedCount: result.deletedCount,
    }
  } catch (error) {
    console.error("Error bulk deleting requests:", error)
    return { success: false, message: "Failed to delete requests", deletedCount: 0 }
  } finally {
    revalidatePath("/admin/assistance-requests")
    revalidatePath("/recent")
  }
}
