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
  Search,
  X,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBookings } from "@/actions/assistance"
import type { Booking } from "@/models/assistance"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import { Users, Heart, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Add these imports at the top
import { getUnreadCommentsCounts } from "@/actions/comments"
import { NotificationBadge } from "@/components/notification-badge"
import { useSession } from "next-auth/react"
import { getBookingById, deleteBooking } from "@/actions/request-details"

export default function RecentPage() {
  const [displayedBookings, setDisplayedBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Update the state to track copied fields
  const [copiedRequestNumber, setCopiedRequestNumber] = useState<string | null>(null)
  const [copiedCharacterId, setCopiedCharacterId] = useState<string | null>(null)
  const [copiedContactInfo, setCopiedContactInfo] = useState<string | null>(null)

  // Add this after the other state declarations
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Add search state
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Load recent bookings from localStorage and refresh from server
  const loadRecentBookings = async () => {
    try {
      // First load from localStorage for immediate display
      const recentBookingsJson = localStorage.getItem("papapi-recent-bookings")
      let localBookings: Booking[] = []

      if (recentBookingsJson) {
        localBookings = JSON.parse(recentBookingsJson)
        if (Array.isArray(localBookings)) {
          setDisplayedBookings(localBookings)
        }
      }

      // Then fetch fresh data for any bookings we have in localStorage
      if (localBookings.length > 0) {
        setIsLoading(true)

        // Extract IDs from local bookings
        const bookingIds = localBookings.map((booking) => booking._id?.toString()).filter((id) => id) as string[]

        // Fetch fresh data for each booking
        const refreshedBookings = await Promise.all(
          bookingIds.map(async (id) => {
            try {
              const freshBooking = await getBookingById(id)
              return freshBooking
            } catch (error) {
              console.error(`Error refreshing booking ${id}:`, error)
              return null
            }
          }),
        )

        // Filter out null results and update displayed bookings
        const validBookings = refreshedBookings.filter((booking) => booking !== null) as Booking[]

        if (validBookings.length > 0) {
          // Update displayed bookings with fresh data
          setDisplayedBookings(validBookings)

          // Update localStorage with fresh data
          localStorage.setItem("papapi-recent-bookings", JSON.stringify(validBookings))
        }

        // Get unread comments counts for these bookings
        const requestIds = validBookings.map((booking) => booking._id?.toString() || "").filter((id) => id)
        if (requestIds.length > 0) {
          const counts = await getUnreadCommentsCounts(requestIds, !!isAdmin)
          setUnreadCounts(counts)
        }
      }
    } catch (error) {
      console.error("Error loading recent bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecentBookings()
  }, [isAdmin])

  // Update the handleSearch function to add the found booking to recent transactions
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      // Get all bookings
      const allBookings = await getBookings()

      // Filter bookings by exact request number match (case insensitive)
      const matchingBookings = allBookings.filter(
        (booking) => booking.requestNumber?.toLowerCase() === searchTerm.toLowerCase(),
      )

      if (matchingBookings.length > 0) {
        // Add the matching booking to displayed bookings without duplicates
        setDisplayedBookings((prevBookings) => {
          // Combine existing bookings with new matching bookings
          const combinedBookings = [...prevBookings]

          // Add each matching booking if it's not already in the list
          matchingBookings.forEach((newBooking) => {
            const isDuplicate = combinedBookings.some((existingBooking) => existingBooking._id === newBooking._id)

            if (!isDuplicate) {
              combinedBookings.unshift(newBooking) // Add to beginning of array
            }
          })

          // Save to localStorage
          localStorage.setItem("papapi-recent-bookings", JSON.stringify(combinedBookings))

          return combinedBookings
        })

        // Get unread comments counts for the updated list
        const requestIds = matchingBookings.map((booking) => booking._id?.toString() || "").filter((id) => id)

        if (requestIds.length > 0) {
          const counts = await getUnreadCommentsCounts(requestIds, !!isAdmin)
          setUnreadCounts((prevCounts) => ({ ...prevCounts, ...counts }))
        }
      } else {
        setError(`No request found matching "${searchTerm}"`)
      }
    } catch (err) {
      console.error("Error searching for bookings:", err)
      setError("Failed to search for assistance requests")
    } finally {
      setIsSearching(false)
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchTerm("")
    setError(null)
  }

  // Add a booking to recent transactions (to be called from other components)
  const addBookingToRecent = (booking: Booking) => {
    setDisplayedBookings((prevBookings) => {
      // Check if booking already exists
      const isDuplicate = prevBookings.some((existingBooking) => existingBooking._id === booking._id)

      if (isDuplicate) {
        return prevBookings
      }

      // Add new booking to the beginning of the list
      const updatedBookings = [booking, ...prevBookings]

      // Save to localStorage
      localStorage.setItem("papapi-recent-bookings", JSON.stringify(updatedBookings.slice(0, 50)))

      return updatedBookings
    })
  }

  // Handle direct request lookup by ID
  const handleRequestLookup = async (requestId: string) => {
    if (!requestId.trim()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const booking = await getBookingById(requestId)

      if (booking) {
        // Add the booking to displayed bookings without duplicates
        addBookingToRecent(booking)
      } else {
        setError(`No request found with ID "${requestId}"`)
      }
    } catch (err) {
      console.error("Error looking up booking:", err)
      setError("Failed to look up assistance request")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle booking deletion
  const handleDeleteBooking = async () => {
    if (!bookingToDelete || !bookingToDelete._id) return

    setIsDeleting(true)
    setMessage(null)

    try {
      const result = await deleteBooking(bookingToDelete._id.toString())

      if (result.success) {
        setMessage({ type: "success", text: result.message })

        // Remove the booking from the displayed list
        setDisplayedBookings((prevBookings) => {
          const updatedBookings = prevBookings.filter((booking) => booking._id !== bookingToDelete._id)

          // Update localStorage
          localStorage.setItem("papapi-recent-bookings", JSON.stringify(updatedBookings))

          return updatedBookings
        })

        setShowDeleteDialog(false)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error deleting booking:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsDeleting(false)
      setBookingToDelete(null)
    }
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Track Your Request</h1>
          <p className="text-muted-foreground">Stay updated on your assistance booking</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/games/ragnarok-m-classic">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Game
          </Link>
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Add search input */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by exact request number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch()
                }
              }}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : displayedBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarClock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Requests to Display</h3>
            <p className="text-muted-foreground mb-6">
              Search for a request by its number or create a new assistance request
            </p>
            <Button asChild>
              <Link href="/games/ragnarok-m-classic">Request Assistance</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((booking) => (
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
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/request/${booking._id}`} className="flex items-center">
                            View Details
                            {unreadCounts[booking._id as string] > 0 && (
                              <NotificationBadge
                                count={unreadCounts[booking._id as string]}
                                size="sm"
                                className="ml-2"
                              />
                            )}
                          </Link>
                        </Button>
                        {booking.status === "cancelled" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setBookingToDelete(booking)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogTitle>Delete Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this cancelled request? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Keep Request
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
