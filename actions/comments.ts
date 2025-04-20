"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { COMMENTS_COLLECTION } from "@/models/comment"
import type { Comment } from "@/models/comment"

// Add a comment to a request
export async function addComment(
  requestId: string,
  content: string,
  isAdmin: boolean,
  authorName?: string,
): Promise<{ success: boolean; message: string; comment?: Comment }> {
  try {
    if (!requestId || !content.trim()) {
      return { success: false, message: "Request ID and comment content are required" }
    }

    const client = await clientPromise
    const db = client.db()

    // Create the comment object
    const comment: Comment = {
      requestId: new ObjectId(requestId),
      content: content.trim(),
      createdAt: new Date(),
      isAdmin,
      authorName,
      isRead: false, // New comments are unread by default
    }

    // Insert the comment
    const result = await db.collection(COMMENTS_COLLECTION).insertOne(comment)

    // Return the comment with the generated ID
    return {
      success: true,
      message: "Comment added successfully",
      comment: { ...comment, _id: result.insertedId },
    }
  } catch (error) {
    console.error("Error adding comment:", error)
    return { success: false, message: "Failed to add comment" }
  } finally {
    revalidatePath(`/request/${requestId}`)
  }
}

// Get comments for a request
export async function getComments(requestId: string): Promise<Comment[]> {
  try {
    if (!requestId) {
      return []
    }

    const client = await clientPromise
    const db = client.db()

    // Get comments for the request, sorted by creation date
    const comments = await db
      .collection(COMMENTS_COLLECTION)
      .find({ requestId: new ObjectId(requestId) })
      .sort({ createdAt: 1 })
      .toArray()

    // Convert to plain objects to ensure no ObjectId instances are returned
    return JSON.parse(JSON.stringify(comments))
  } catch (error) {
    console.error("Error getting comments:", error)
    return []
  }
}

// Mark comments as read
export async function markCommentsAsRead(
  requestId: string,
  isAdmin: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!requestId) {
      return { success: false, message: "Request ID is required" }
    }

    const client = await clientPromise
    const db = client.db()

    // Mark comments as read based on who is viewing them
    // Admin sees customer comments, customer sees admin comments
    await db.collection(COMMENTS_COLLECTION).updateMany(
      {
        requestId: new ObjectId(requestId),
        isAdmin: !isAdmin, // Mark comments from the other party as read
        isRead: false, // Only update unread comments
      },
      { $set: { isRead: true } },
    )

    return { success: true, message: "Comments marked as read" }
  } catch (error) {
    console.error("Error marking comments as read:", error)
    return { success: false, message: "Failed to mark comments as read" }
  } finally {
    revalidatePath(`/request/${requestId}`)
  }
}

// Get unread comments count for a request
export async function getUnreadCommentsCount(requestId: string, isAdmin: boolean): Promise<number> {
  try {
    if (!requestId) {
      return 0
    }

    const client = await clientPromise
    const db = client.db()

    // Count unread comments based on who is viewing them
    const count = await db.collection(COMMENTS_COLLECTION).countDocuments({
      requestId: new ObjectId(requestId),
      isAdmin: !isAdmin, // Count comments from the other party
      isRead: false,
    })

    return count
  } catch (error) {
    console.error("Error getting unread comments count:", error)
    return 0
  }
}

// Get unread comments counts for multiple requests
export async function getUnreadCommentsCounts(requestIds: string[], isAdmin: boolean): Promise<Record<string, number>> {
  try {
    if (!requestIds || requestIds.length === 0) {
      return {}
    }

    const client = await clientPromise
    const db = client.db()

    // Convert string IDs to ObjectIds
    const objectIds = requestIds.map((id) => new ObjectId(id))

    // Get all unread comments for the specified requests
    const unreadComments = await db
      .collection(COMMENTS_COLLECTION)
      .find({
        requestId: { $in: objectIds },
        isAdmin: !isAdmin, // Count comments from the other party
        isRead: false,
      })
      .toArray()

    // Count unread comments per request
    const counts: Record<string, number> = {}
    unreadComments.forEach((comment) => {
      const requestId = comment.requestId.toString()
      counts[requestId] = (counts[requestId] || 0) + 1
    })

    return counts
  } catch (error) {
    console.error("Error getting unread comments counts:", error)
    return {}
  }
}
