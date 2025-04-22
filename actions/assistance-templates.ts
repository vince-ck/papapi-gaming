"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { uploadImageToBlob, deleteImageFromBlob } from "@/lib/blob-utils"
import { type AssistanceTemplate, ASSISTANCE_TEMPLATES_COLLECTION } from "@/models/assistance-template"

// Get all assistance templates
export async function getAssistanceTemplates(activeOnly = false): Promise<AssistanceTemplate[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    let query = {}
    if (activeOnly) {
      query = { isActive: true }
    }

    const templates = await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).find(query).sort({ listOrder: 1 }).toArray()

    return JSON.parse(JSON.stringify(templates))
  } catch (error) {
    console.error("Error fetching assistance templates:", error)
    return []
  }
}

// Get a single assistance template by ID
export async function getAssistanceTemplateById(id: string): Promise<AssistanceTemplate | null> {
  try {
    const client = await clientPromise
    const db = client.db()

    const template = await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).findOne({ _id: new ObjectId(id) })

    return template ? JSON.parse(JSON.stringify(template)) : null
  } catch (error) {
    console.error("Error fetching assistance template:", error)
    return null
  }
}

// Create or update an assistance template
export async function saveAssistanceTemplate(
  formData: FormData,
): Promise<{ success: boolean; message: string; template?: AssistanceTemplate }> {
  try {
    const client = await clientPromise
    const db = client.db()

    const id = formData.get("id") as string
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const assistanceTypeId = formData.get("assistanceTypeId") as string
    const additionalInfo = formData.get("additionalInfo") as string
    const imageFile = formData.get("image") as File | null
    const currentImageUrl = formData.get("currentImageUrl") as string
    const isActive = formData.get("isActive") === "true"

    if (!title || !assistanceTypeId || !additionalInfo) {
      return { success: false, message: "Title, assistance type, and additional info are required" }
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

    // Prepare the template data
    const templateData: Partial<AssistanceTemplate> = {
      title,
      description,
      assistanceTypeId: new ObjectId(assistanceTypeId),
      additionalInfo,
      imageUrl,
      isActive,
      updatedAt: now,
    }

    // Update or create the template
    if (id) {
      // Update existing template
      await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: templateData })

      return {
        success: true,
        message: `${title} updated successfully`,
        template: { ...templateData, _id: id } as AssistanceTemplate,
      }
    } else {
      // Get the highest listOrder
      const highestOrder = await db
        .collection(ASSISTANCE_TEMPLATES_COLLECTION)
        .find({})
        .sort({ listOrder: -1 })
        .limit(1)
        .toArray()

      const listOrder = highestOrder.length > 0 ? highestOrder[0].listOrder + 1 : 1

      // Create new template
      templateData.listOrder = listOrder
      templateData.createdAt = now

      const result = await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).insertOne(templateData as AssistanceTemplate)

      return {
        success: true,
        message: `${title} created successfully`,
        template: { ...templateData, _id: result.insertedId } as AssistanceTemplate,
      }
    }
  } catch (error) {
    console.error("Error saving assistance template:", error)
    return { success: false, message: "Failed to save assistance template" }
  } finally {
    revalidatePath("/admin/assistance-templates")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Delete an assistance template
export async function deleteAssistanceTemplate(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Get the template to delete its image
    const template = await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).findOne({ _id: new ObjectId(id) })

    if (!template) {
      return { success: false, message: "Assistance template not found" }
    }

    // Delete the image from Vercel Blob
    if (template.imageUrl) {
      try {
        await deleteImageFromBlob(template.imageUrl)
      } catch (error) {
        console.error("Error deleting image:", error)
        // Continue even if image deletion fails
      }
    }

    // Delete the template from the database
    await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).deleteOne({ _id: new ObjectId(id) })

    return { success: true, message: "Assistance template deleted successfully" }
  } catch (error) {
    console.error("Error deleting assistance template:", error)
    return { success: false, message: "Failed to delete assistance template" }
  } finally {
    revalidatePath("/admin/assistance-templates")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Toggle template status
export async function toggleTemplateStatus(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Validate the ID
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return { success: false, message: "Invalid assistance template ID" }
    }

    // Update the template's isActive status
    await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).updateOne({ _id: objectId }, { $set: { isActive } })

    return {
      success: true,
      message: `Template ${isActive ? "activated" : "deactivated"} successfully`,
    }
  } catch (error) {
    console.error("Error toggling template status:", error)
    return { success: false, message: "Failed to toggle template status" }
  } finally {
    revalidatePath("/admin/assistance-templates")
    revalidatePath("/games/ragnarok-m-classic")
  }
}

// Update template order
export async function updateTemplateOrder(
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
      return { success: false, message: "Invalid assistance template ID" }
    }

    // Update the template's listOrder
    await db.collection(ASSISTANCE_TEMPLATES_COLLECTION).updateOne({ _id: objectId }, { $set: { listOrder: newOrder } })

    return { success: true, message: "Template order updated successfully" }
  } catch (error) {
    console.error("Error updating template order:", error)
    return { success: false, message: "Failed to update template order" }
  } finally {
    revalidatePath("/admin/assistance-templates")
    revalidatePath("/games/ragnarok-m-classic")
  }
}
