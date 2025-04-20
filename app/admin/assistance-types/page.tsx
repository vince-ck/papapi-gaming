"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAssistanceTypes, updateAssistanceTypeOrder } from "@/actions/assistance"
import type { AssistanceType } from "@/models/assistance"
import Link from "next/link"
import { LoginModal } from "@/components/login-modal"

export default function AdminAssistanceTypesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
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

  // Load assistance types
  useEffect(() => {
    const loadAssistanceTypes = async () => {
      if (status !== "authenticated" || session?.user?.role !== "admin") return

      setIsLoading(true)
      try {
        const types = await getAssistanceTypes()
        // Sort by listOrder
        const sortedTypes = [...types].sort((a, b) => (a.listOrder || 0) - (b.listOrder || 0))
        setAssistanceTypes(sortedTypes)
      } catch (error) {
        console.error("Error loading assistance types:", error)
        setMessage({ type: "error", text: "Failed to load assistance types" })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssistanceTypes()
  }, [status, session])

  // Move assistance type up in the order
  const moveUp = async (index: number) => {
    if (index <= 0) return

    const newTypes = [...assistanceTypes]
    const temp = newTypes[index]
    newTypes[index] = newTypes[index - 1]
    newTypes[index - 1] = temp

    // Update listOrder for both items
    newTypes[index].listOrder = index + 1
    newTypes[index - 1].listOrder = index

    setAssistanceTypes(newTypes)

    try {
      setIsSaving(true)
      // Update in database
      await updateAssistanceTypeOrder(temp._id as string, index)
      await updateAssistanceTypeOrder(newTypes[index]._id as string, index + 1)
      setMessage({ type: "success", text: "Order updated successfully" })
    } catch (error) {
      console.error("Error updating order:", error)
      setMessage({ type: "error", text: "Failed to update order" })
    } finally {
      setIsSaving(false)
    }
  }

  // Move assistance type down in the order
  const moveDown = async (index: number) => {
    if (index >= assistanceTypes.length - 1) return

    const newTypes = [...assistanceTypes]
    const temp = newTypes[index]
    newTypes[index] = newTypes[index + 1]
    newTypes[index + 1] = temp

    // Update listOrder for both items
    newTypes[index].listOrder = index + 1
    newTypes[index + 1].listOrder = index + 2

    setAssistanceTypes(newTypes)

    try {
      setIsSaving(true)
      // Update in database
      await updateAssistanceTypeOrder(temp._id as string, index + 2)
      await updateAssistanceTypeOrder(newTypes[index]._id as string, index + 1)
      setMessage({ type: "success", text: "Order updated successfully" })
    } catch (error) {
      console.error("Error updating order:", error)
      setMessage({ type: "error", text: "Failed to update order" })
    } finally {
      setIsSaving(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Assistance Types</h1>
          <p className="text-muted-foreground">Manage and reorder assistance types</p>
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
        <CardHeader>
          <CardTitle>Manage Assistance Types</CardTitle>
          <CardDescription>Drag and drop to reorder or use the arrow buttons</CardDescription>
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
          ) : assistanceTypes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assistance types found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assistanceTypes.map((type, index) => (
                <div
                  key={type._id as string}
                  className="flex items-center justify-between p-3 border rounded-md bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center">{index + 1}</div>
                    <div>
                      <h3 className="font-medium">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || isSaving}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveDown(index)}
                      disabled={index === assistanceTypes.length - 1 || isSaving}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            The order here determines how assistance types appear in the dropdown
          </p>
        </CardFooter>
      </Card>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    </div>
  )
}
