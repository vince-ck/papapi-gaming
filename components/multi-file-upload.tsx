"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, ImageIcon, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface MultiFileUploadProps {
  maxFiles?: number
  maxSizeMB?: number
  onChange?: (urls: string[]) => void
  value?: string[]
  className?: string
}

export function MultiFileUpload({
  maxFiles = 2,
  maxSizeMB = 2,
  onChange,
  value = [],
  className,
}: MultiFileUploadProps) {
  // Initialize with empty arrays if value is undefined
  const initialValue = Array.isArray(value) ? value : []
  const [fileUrls, setFileUrls] = useState<string[]>(initialValue)
  const [previews, setPreviews] = useState<string[]>(initialValue)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert MB to bytes
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith("image/")) {
      return "Only image files are allowed"
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    return null
  }

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "assistance-photos")

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload file")
    }

    const data = await response.json()
    return data.url
  }

  const processFiles = async (filesToProcess: File[]) => {
    // Ensure fileUrls is an array before accessing length
    const currentFileUrls = Array.isArray(fileUrls) ? fileUrls : []

    if (currentFileUrls.length + filesToProcess.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} images`)
      return
    }

    // Validate each file
    for (const file of filesToProcess) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const newUrls: string[] = []
      const newPreviews: string[] = []

      // Upload each file and track progress
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i]

        // Create a temporary preview
        const previewUrl = URL.createObjectURL(file)
        newPreviews.push(previewUrl)

        // Upload the file
        const url = await uploadFile(file)
        newUrls.push(url)

        // Update progress
        setUploadProgress(((i + 1) / filesToProcess.length) * 100)
      }

      // Update state with new URLs and previews
      // Ensure we're working with arrays
      const updatedUrls = [...currentFileUrls, ...newUrls]
      const updatedPreviews = [...(Array.isArray(previews) ? previews : []), ...newPreviews]

      setFileUrls(updatedUrls)
      setPreviews(updatedPreviews)
      onChange?.(updatedUrls)
    } catch (error) {
      console.error("Error uploading files:", error)
      setError("Failed to upload one or more files")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }

  const handleRemoveFile = (index: number) => {
    // Ensure we're working with arrays
    const currentFileUrls = Array.isArray(fileUrls) ? fileUrls : []
    const currentPreviews = Array.isArray(previews) ? previews : []

    const newUrls = [...currentFileUrls]
    newUrls.splice(index, 1)
    setFileUrls(newUrls)

    const newPreviews = [...currentPreviews]
    newPreviews.splice(index, 1)
    setPreviews(newPreviews)

    onChange?.(newUrls)
    setError(null)
  }

  // Ensure fileUrls is always an array for the render logic
  const safeFileUrls = Array.isArray(fileUrls) ? fileUrls : []
  const safePreviews = Array.isArray(previews) ? previews : []

  return (
    <div className={cn("space-y-2", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Uploading...</span>
            <span className="text-sm">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      <div
        className={cn(
          "relative flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          (safeFileUrls.length >= maxFiles || isUploading) && "opacity-50 pointer-events-none",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          className="hidden"
          onChange={handleFileChange}
          disabled={safeFileUrls.length >= maxFiles || isUploading}
        />

        <div className="flex flex-col items-center justify-center p-4 text-center">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          )}

          <p className="text-sm font-medium mb-1">
            {isUploading
              ? "Uploading images..."
              : safeFileUrls.length >= maxFiles
                ? `Maximum ${maxFiles} images uploaded`
                : `Drag and drop ${safeFileUrls.length > 0 ? "more " : ""}images here`}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            {isUploading
              ? "Please wait..."
              : safeFileUrls.length >= maxFiles
                ? "Remove an image to upload another"
                : `or click to browse (${safeFileUrls.length}/${maxFiles})`}
          </p>

          {!isUploading && safeFileUrls.length < maxFiles && (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Select Images
            </Button>
          )}
        </div>
      </div>

      {safeFileUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {safeFileUrls.map((url, index) => (
            <div key={index} className="relative rounded-md border border-border overflow-hidden h-24">
              <div className="absolute inset-0">
                <Image
                  src={safePreviews[index] || url || "/placeholder.svg"}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload up to {maxFiles} images (max {maxSizeMB}MB each)
      </p>
    </div>
  )
}
