"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import {
  Loader2,
  CalendarClock,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  ArrowLeft,
  Edit,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { getBookingById, cancelBooking } from "@/actions/request-details"
import type { Booking } from "@/models/assistance"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RequestEditWizard } from "@/components/request-edit-wizard"
import { CommentSection } from "@/components/comment-section"
import { getComments } from "@/actions/comments"
import type { Comment } from "@/models/comment"
import { useSession } from "next-auth/react"
import { markCommentsAsRead } from "@/actions/comments"

export default function RequestDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [comments, setComments] = useState<Comment[]>([])

  // Track copied fields
  const [copiedRequestNumber, setCopiedRequestNumber] = useState(false)
  const [copiedCharacterId, setCopiedCharacterId] = useState(false)
  const [copiedContactInfo, setCopiedContactInfo] = useState(false)

  // Load booking data
  useEffect(() => {
    const loadBooking = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getBookingById(id)
        if (data) {
          setBooking(data)

          // Load comments for this request
          const commentsData = await getComments(id)
          setComments(commentsData)

          // Mark comments as read when viewing the request
          const isAdmin = session?.user?.role === "admin"
          await markCommentsAsRead(id, !!isAdmin)
        } else {
          setError("Request not found")
        }
      } catch (err) {
        console.error("Error loading booking:", err)
        setError("Failed to load request details")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      loadBooking()
    }
  }, [id, session?.user?.role])

  // Copy to clipboard function
  const copyToClipboard = (text: string, type: "requestNumber" | "characterId" | "contactInfo") => {
    navigator.clipboard.writeText(text)

    // Set the appropriate state based on the field type
    if (type === "requestNumber") {
      setCopiedRequestNumber(true)
      setTimeout(() => setCopiedRequestNumber(false), 2000)
    } else if (type === "characterId") {
      setCopiedCharacterId(true)
      setTimeout(() => setCopiedCharacterId(false), 2000)
    } else if (type === "contactInfo") {
      setCopiedContactInfo(true)
      setTimeout(() => setCopiedContactInfo(false), 2000)
    }
  }

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!booking || !id) return

    setIsCancelling(true)
    setMessage(null)

    try {
      const result = await cancelBooking(id)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        // Update the booking status locally
        setBooking((prev) => (prev ? { ...prev, status: "cancelled" } : null))
        setShowCancelDialog(false)

        // Redirect after a short delay
        setTimeout(() => {
          router.push("/recent")
        }, 2000)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsCancelling(false)
    }
  }

  // Handle booking update
  const handleBookingUpdated = (updatedBooking: Booking) => {
    setBooking(updatedBooking)
    // Don't exit edit mode when updates happen automatically
    // setIsEditMode(false);
    setMessage({ type: "success", text: "Request updated successfully" })

    // Clear message after a short delay
    setTimeout(() => {
      setMessage(null)
    }, 2000)
  }

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Pending
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Confirmed
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "confirmed":
        return <CalendarClock className="h-5 w-5 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  // Format time string to AM/PM format
  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  // Get time range label
  const getTimeRangeLabel = (preset: string): string => {
    switch (preset) {
      case "early":
        return "Early (5:00 - 10:00)"
      case "middle":
        return "Middle (10:00 - 14:00)"
      case "late":
        return "Late (14:00 - 19:00)"
      default:
        return "Custom time"
    }
  }

  // Format selected days for display
  const formatSelectedDays = (days: string[] | undefined): string => {
    // Check if days is undefined or empty
    if (!days || !Array.isArray(days) || days.length === 0) return "No days selected"
    if (days.length === 7) return "Every day"

    const dayLabels: Record<string, string> = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    }

    // Sort days according to calendar order (Monday first)
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const orderedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

    return orderedDays.map((day) => dayLabels[day] || day).join(", ")
  }

  // Check if booking can be edited (only pending bookings can be edited)
  const canEdit = booking && booking.status === "pending"

  // Check if booking can be cancelled (only pending or confirmed bookings can be cancelled)
  const canCancel = booking && (booking.status === "pending" || booking.status === "confirmed")

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Details</h1>
          <p className="text-muted-foreground">View and manage your assistance request</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/recent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Requests
          </Link>
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
            <h3 className="text-xl font-medium mb-2">Request Not Found</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link href="/recent">View All Requests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !booking ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
            <h3 className="text-xl font-medium mb-2">Request Not Found</h3>
            <p className="text-muted-foreground mb-6">The requested assistance request could not be found</p>
            <Button asChild>
              <Link href="/recent">View All Requests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : isEditMode ? (
        <div className="w-full">
          <RequestEditWizard booking={booking} onCancel={() => setIsEditMode(false)} onSuccess={handleBookingUpdated} />
        </div>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">{getStatusIcon(booking.status)}</div>
                <div>
                  <CardTitle className="text-xl">{booking.assistanceTypeName}</CardTitle>
                  <CardDescription>
                    Request #{booking.requestNumber} • {getStatusBadge(booking.status)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button variant="outline" className="gap-2" onClick={() => setIsEditMode(true)}>
                    <Edit className="h-4 w-4" />
                    Edit Request
                  </Button>
                )}
                {canCancel && (
                  <Button variant="destructive" className="gap-2" onClick={() => setShowCancelDialog(true)}>
                    <XCircle className="h-4 w-4" />
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="py-6">
            <div className="space-y-6">
              {/* Request Information */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Request Information</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Request Number</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{booking.requestNumber}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(booking.requestNumber, "requestNumber")}
                        >
                          {copiedRequestNumber ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span>{getStatusBadge(booking.status)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">
                        {booking.createdAt ? format(new Date(booking.createdAt), "PPP p") : "N/A"}
                      </span>
                    </div>

                    {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <span className="text-sm">{format(new Date(booking.updatedAt), "PPP p")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Contact Information</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Character ID</span>
                      <div className="flex items-center gap-1">
                        <span>{booking.characterId}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(booking.characterId, "characterId")}
                        >
                          {copiedCharacterId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contact Info</span>
                      <div className="flex items-center gap-1">
                        <span>{booking.contactInfo}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(booking.contactInfo, "contactInfo")}
                        >
                          {copiedContactInfo ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t p-4 flex justify-between">
            <p className="text-sm text-muted-foreground">
              {booking.status === "pending"
                ? "Your request is pending. Our team will review it shortly."
                : booking.status === "confirmed"
                  ? "Your request has been confirmed. Our team will assist you at the scheduled time."
                  : booking.status === "completed"
                    ? "This request has been completed. Thank you for using our service."
                    : "This request has been cancelled."}
            </p>
            <Button variant="outline" asChild>
              <Link href="/recent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Requests
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !error && booking && (
        <Card className="mt-6">
          <CardContent className="py-6">
            <CommentSection requestId={booking._id?.toString() || ""} initialComments={comments} />
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogTitle>Photo Preview</DialogTitle>
            <div className="relative w-full h-[60vh]">
              <Image src={selectedImage || "/placeholder.svg"} alt="Photo preview" fill className="object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogTitle>Cancel Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this assistance request? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isCancelling}>
              Keep Request
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={isCancelling}>
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
