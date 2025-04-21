"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import Image from "next/image"
import {
  Loader2,
  CalendarClock,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Info,
  ImageIcon,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBookings } from "@/actions/assistance"
import type { Booking } from "@/models/assistance"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { Users, Heart, Calendar } from "lucide-react"

// Add these imports at the top
import { getUnreadCommentsCounts } from "@/actions/comments"
import { NotificationBadge } from "@/components/notification-badge"
import { useSession } from "next-auth/react"

export default function RecentPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // Update the state to track copied fields
  const [copiedRequestNumber, setCopiedRequestNumber] = useState<string | null>(null)
  const [copiedCharacterId, setCopiedCharacterId] = useState<string | null>(null)
  const [copiedContactInfo, setCopiedContactInfo] = useState<string | null>(null)

  // Add this after the other state declarations
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Update the existing loadBookings function inside the useEffect
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await getBookings()
        setBookings(data)

        // Get unread comments counts
        if (data.length > 0) {
          const requestIds = data.map((booking) => booking._id?.toString() || "").filter((id) => id)
          const counts = await getUnreadCommentsCounts(requestIds, !!isAdmin)
          setUnreadCounts(counts)
        }
      } catch (err) {
        console.error("Error loading bookings:", err)
        setError("Failed to load assistance requests")
      } finally {
        setIsLoading(false)
      }
    }

    loadBookings()
  }, [isAdmin])

  // Update the copy function to handle different field types
  const copyToClipboard = (text: string, type: "requestNumber" | "characterId" | "contactInfo") => {
    navigator.clipboard.writeText(text)

    // Set the appropriate state based on the field type
    if (type === "requestNumber") {
      setCopiedRequestNumber(text)
      setTimeout(() => setCopiedRequestNumber(null), 2000)
    } else if (type === "characterId") {
      setCopiedCharacterId(text)
      setTimeout(() => setCopiedCharacterId(null), 2000)
    } else if (type === "contactInfo") {
      setCopiedContactInfo(text)
      setTimeout(() => setCopiedContactInfo(null), 2000)
    }
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

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Transactions</h1>
          <p className="text-muted-foreground">View all your transactions</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/games/ragnarok-m-classic">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Game
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarClock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Assistance Requests</h3>
            <p className="text-muted-foreground mb-6">You haven't made any assistance requests yet</p>
            <Button asChild>
              <Link href="/games/ragnarok-m-classic">Request Assistance</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking._id as string} className="overflow-hidden">
              <div className="flex border-l-4 border-primary">
                <div className="flex items-center justify-center p-4 bg-primary/5">{getStatusIcon(booking.status)}</div>
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{booking.assistanceTypeName}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <p className="text-sm text-muted-foreground">Character ID: {booking.characterId}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(booking.characterId, "characterId")}
                          >
                            {copiedCharacterId === booking.characterId ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {booking.requestNumber && (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{booking.requestNumber}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => copyToClipboard(booking.requestNumber, "requestNumber")}
                            >
                              {copiedRequestNumber === booking.requestNumber ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      {booking.contactInfo && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{booking.contactInfo}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(booking.contactInfo, "contactInfo")}
                          >
                            {copiedContactInfo === booking.contactInfo ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(booking.status)}
                      <Button variant="outline" size="sm" asChild className="mt-2">
                        <Link href={`/request/${booking._id}`} className="flex items-center">
                          View Details
                          {unreadCounts[booking._id as string] > 0 && (
                            <NotificationBadge count={unreadCounts[booking._id as string]} size="sm" className="ml-2" />
                          )}
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Display schedule information */}
                  <div className="mt-2 text-sm">
                    {booking.selectedDays && Array.isArray(booking.selectedDays) && booking.selectedDays.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatSelectedDays(booking.selectedDays)}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {booking.timeRangePreset === "custom"
                              ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                              : getTimeRangeLabel(booking.timeRangePreset)}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {format(new Date(booking.startDate || booking.startDateTime), "PPP p")} -{" "}
                          {format(new Date(booking.endDate || booking.endDateTime), "p")}
                        </span>
                      </p>
                    )}

                    {/* Display slots and donation info if available */}
                    {booking.slots && (
                      <p className="flex items-center gap-1 mt-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {booking.slots} {booking.slots === 1 ? "slot" : "slots"}
                        </span>
                      </p>
                    )}

                    {booking.willingToDonate && (
                      <p className="flex items-center gap-1 mt-1">
                        <Heart
                          className={`h-3.5 w-3.5 ${booking.willingToDonate === "yes" ? "text-red-500" : "text-muted-foreground"}`}
                        />
                        <span>Willing to donate: {booking.willingToDonate === "yes" ? "Yes" : "No"}</span>
                      </p>
                    )}
                  </div>

                  {booking.additionalInfo && (
                    <div className="mt-2 text-sm border-t border-border/40 pt-2">
                      <p className="flex items-start gap-1">
                        <Info className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                        <span>{booking.additionalInfo}</span>
                      </p>
                    </div>
                  )}

                  {booking.photoUrls && Array.isArray(booking.photoUrls) && booking.photoUrls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Attached Photos:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {booking.photoUrls.map((url, index) => (
                          <div
                            key={index}
                            className="relative h-16 rounded-md overflow-hidden border border-border cursor-pointer"
                            onClick={() => setSelectedImage(url)}
                          >
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={`Photo ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
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
    </div>
  )
}
