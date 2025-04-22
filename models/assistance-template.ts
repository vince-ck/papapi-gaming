import type { ObjectId } from "mongodb"

export interface AssistanceTemplate {
  _id?: ObjectId | string
  title: string
  description: string
  assistanceTypeId: string | ObjectId
  additionalInfo: string
  imageUrl?: string
  selectedDays?: string[]
  timeRangePreset?: "early" | "middle" | "late" | "custom"
  startTime?: string
  endTime?: string
  slots?: number
  isActive: boolean
  listOrder: number
  createdAt: Date
  updatedAt?: Date
}

export const ASSISTANCE_TEMPLATES_COLLECTION = "assistanceTemplates"
