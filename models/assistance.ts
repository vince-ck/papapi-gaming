import type { ObjectId } from "mongodb"

export interface AssistanceType {
  _id?: ObjectId | string
  name: string
  description?: string
  icon?: string
  isActive: boolean
  listOrder: number // Added listOrder field
  allowPhotoUpload?: boolean // New flag to control photo upload visibility
  allowSchedule?: boolean // New flag to control schedule visibility
}

export interface Booking {
  _id?: ObjectId | string
  requestNumber: string
  characterId: string
  contactInfo: string
  assistanceTypeId: string | ObjectId
  assistanceTypeName?: string
  additionalInfo: string
  photoUrls?: string[]

  // New fields from the form
  selectedDays: string[]
  timeRangePreset: "early" | "middle" | "late" | "custom"
  startTime?: string
  endTime?: string
  slots: number
  willingToDonate: "yes" | "no"

  // Legacy fields - keeping for backward compatibility
  startDateTime: Date
  endDateTime: Date

  status: "pending" | "confirmed" | "completed" | "cancelled"
  createdAt: Date
  updatedAt?: Date
}

export const ASSISTANCE_TYPES_COLLECTION = "assistanceTypes"
export const BOOKINGS_COLLECTION = "bookings"
