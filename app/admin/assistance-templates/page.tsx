"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, ArrowUp, ArrowDown, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ImageUpload } from "@/components/image-upload"
import { LoginModal } from "@/components/login-modal"
import {
  getAssistanceTemplates,
  saveAssistanceTemplate,
  deleteAssistanceTemplate,
  toggleTemplateStatus,
  updateTemplateOrder,
} from "@/actions/assistance-templates"
import { getAssistanceTypes } from "@/actions/assistance"
import type { AssistanceTemplate } from "@/models/assistance-template"
import type { AssistanceType } from "@/models/assistance"

export default function AdminAssistanceTemplatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [templates, setTemplates] = useState<AssistanceTemplate[]>([])
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<AssistanceTemplate | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
      setIsLoginModalOpen(true)
    } else {
      setIsLoginModalOpen(false)
    }
  }, [session, status])

  // Handle modal close - redirect to home if not authenticated
  const handleModalClose = () => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
      router.push("/")
    } else {
      setIsLoginModalOpen(false)
    }
  }

  // Load templates and assistance types
  useEffect(() => {
    const loadData = async () => {
      if (status !== "authenticated" || session?.user?.role !== "admin") return

      setIsLoading(true)
      try {
        const [templatesData, typesData] = await Promise.all([getAssistanceTemplates(), getAssistanceTypes()])

        setTemplates(templatesData)
        setAssistanceTypes(typesData)
      } catch (error) {
        console.error("Error loading data:", error)
        setMessage({ type: "error", text: "Failed to load data" })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [status, session])

  // Handle form submission
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const formData = new FormData(event.currentTarget)

      // Add the selected file if it exists
      if (selectedFile) {
        formData.set("image", selectedFile)
      }

      const result = await saveAssistanceTemplate(formData)

      if (result.success) {
        setMessage({ type: "success", text: result.message })

        // Refresh templates
        const updatedTemplates = await getAssistanceTemplates()
        setTemplates(updatedTemplates)

        setIsDialogOpen(false)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error saving template:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle template deletion
  async function handleDelete() {
    if (!currentTemplate?._id) return

    setIsDeleting(true)
    try {
      const result = await deleteAssistanceTemplate(currentTemplate._id.toString())

      if (result.success) {
        setMessage({ type: "success", text: result.message })

        // Remove the deleted template from the state
        setTemplates(templates.filter((t) => t._id !== currentTemplate._id))

        setIsDeleteDialogOpen(false)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      setMessage({ type: "error", text: "Failed to delete template" })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle template status toggle
  async function handleToggleStatus(id: string, isActive: boolean) {
    try {
      const result = await toggleTemplateStatus(id, isActive)

      if (result.success) {
        // Update the template in the state
        setTemplates(templates.map((t) => (t._id === id ? { ...t, isActive } : t)))

        setMessage({ type: "success", text: result.message })
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error toggling template status:", error)
      setMessage({ type: "error", text: "Failed to update template status" })
    }
  }

  // Handle template order update
  async function handleMoveUp(index: number) {
    if (index <= 0) return

    const template = templates[index]
    const prevTemplate = templates[index - 1]

    try {
      await Promise.all([
        updateTemplateOrder(template._id as string, prevTemplate.order || index - 1),
        updateTemplateOrder(prevTemplate._id as string, template.order || index),
      ])

      // Update the local state
      const newTemplates = [...templates]
      newTemplates[index] = { ...prevTemplate, order: template.order || index }
      newTemplates[index - 1] = { ...template, order: prevTemplate.order || index - 1 }
      setTemplates(newTemplates)

      setMessage({ type: "success", text: "Template order updated" })
    } catch (error) {
      console.error("Error updating template order:", error)
      setMessage({ type: "error", text: "Failed to update template order" })
    }
  }

  async function handleMoveDown(index: number) {
    if (index >= templates.length - 1) return

    const template = templates[index]
    const nextTemplate = templates[index + 1]

    try {
      await Promise.all([
        updateTemplateOrder(template._id as string, nextTemplate.order || index + 1),
        updateTemplateOrder(nextTemplate._id as string, template.order || index),
      ])

      // Update the local state
      const newTemplates = [...templates]
      newTemplates[index] = { ...nextTemplate, order: template.order || index }
      newTemplates[index + 1] = { ...template, order: nextTemplate.order || index + 1 }
      setTemplates(newTemplates)

      setMessage({ type: "success", text: "Template order updated" })
    } catch (error) {
      console.error("Error updating template order:", error)
      setMessage({ type: "error", text: "Failed to update template order" })
    }
  }

  // Open new template dialog
  function openNewTemplateDialog() {
    setCurrentTemplate(null)
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  // Open edit template dialog
  function openEditTemplateDialog(template: AssistanceTemplate) {
    setCurrentTemplate(template)
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  // Open delete confirmation dialog
  function confirmDelete(template: AssistanceTemplate) {
    setCurrentTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // If not admin, show login modal
  if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
    return (
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    )
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistance Templates</h1>
          <p className="text-muted-foreground">Create and manage pre-defined assistance templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Assistance Templates</CardTitle>
            <CardDescription>Create templates that users can use to quickly start assistance requests</CardDescription>
          </div>
          <Button onClick={openNewTemplateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Template
          </Button>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No assistance templates found</p>
              <Button onClick={openNewTemplateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template, index) => (
                <div
                  key={template._id as string}
                  className={`flex flex-col md:flex-row gap-4 p-4 border rounded-lg ${
                    template.isActive ? "bg-card" : "bg-muted/30 opacity-70"
                  }`}
                >
                  {template.imageUrl && (
                    <div className="relative w-full md:w-48 h-32 overflow-hidden rounded-md border">
                      <Image
                        src={template.imageUrl || "/placeholder.svg"}
                        alt={template.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{template.title}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <p className="text-xs mt-1">
                          <span className="font-medium">Type:</span> {template.assistanceTypeName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => handleToggleStatus(template._id as string, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditTemplateDialog(template)}>
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(template)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                        <ArrowUp className="mr-2 h-3.5 w-3.5" />
                        Move Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === templates.length - 1}
                      >
                        <ArrowDown className="mr-2 h-3.5 w-3.5" />
                        Move Down
                      </Button>
                      <Button
                        variant={template.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleStatus(template._id as string, !template.isActive)}
                      >
                        {template.isActive ? (
                          <>
                            <EyeOff className="mr-2 h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Active templates will be shown to users when creating assistance requests
          </p>
        </CardFooter>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
            <DialogDescription>
              {currentTemplate
                ? "Update the details for this assistance template"
                : "Create a new template that users can use to start assistance requests"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentTemplate && <input type="hidden" name="id" value={currentTemplate._id as string} />}
            {currentTemplate?.imageUrl && (
              <input type="hidden" name="currentImageUrl" value={currentTemplate.imageUrl} />
            )}
            <input type="hidden" name="order" value={currentTemplate?.order || templates.length} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={currentTemplate?.title || ""}
                  placeholder="e.g., Quick Boss Hunt"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assistanceTypeId">Assistance Type</Label>
                <Select
                  name="assistanceTypeId"
                  defaultValue={currentTemplate?.assistanceTypeId?.toString() || ""}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assistance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistanceTypes.map((type) => (
                      <SelectItem key={type._id as string} value={type._id as string}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={currentTemplate?.description || ""}
                placeholder="Brief description of this template"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Default Additional Information</Label>
              <Textarea
                id="additionalInfo"
                name="additionalInfo"
                defaultValue={currentTemplate?.additionalInfo || ""}
                placeholder="Default information to include in the request"
                rows={5}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="isActive" name="isActive" defaultChecked={currentTemplate?.isActive !== false} />
              <Label htmlFor="isActive">Active (visible to users)</Label>
            </div>

            <ImageUpload currentImageUrl={currentTemplate?.imageUrl} onChange={setSelectedFile} />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{currentTemplate?.title}" template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Template"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    </div>
  )
}
