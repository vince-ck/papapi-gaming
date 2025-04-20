import type { ObjectId } from "mongodb"

export interface Comment {
  _id?: ObjectId | string
  requestId: string | ObjectId
  content: string
  createdAt: Date
  isAdmin: boolean
  authorName?: string // Optional custom name
  isRead?: boolean // Whether the comment has been read by the recipient
}

export const COMMENTS_COLLECTION = "comments"
