import type { ObjectId } from "mongodb"

export interface FeaturedToon {
  _id?: ObjectId | string
  characterClass: string
  displayName: string
  imageUrl: string
  description?: string
  createdAt?: Date
  updatedAt?: Date
}

export const FEATURED_TOON_COLLECTION = "featuredToons"
