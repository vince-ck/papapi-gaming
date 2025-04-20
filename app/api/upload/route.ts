import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "uploads"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Generate a unique filename with the original extension
    const fileExtension = file.name.split(".").pop() || "jpg"
    const uniqueFilename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

    // Upload to Vercel Blob
    const { url } = await put(uniqueFilename, file, {
      access: "public",
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
}
