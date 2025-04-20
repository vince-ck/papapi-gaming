"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, CalendarClock, Copy, Check, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getBookings } from "@/actions/assistance"
import { getUnreadCommentsCounts } from "@/actions/comments"
import { useSession } from "next-auth/react"
import type { Booking } from "@/models/assistance"
import { NotificationBadge } from "@/components/notification-badge"

export function BookingsDisplay() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Update the state to track copied fields
  const [copiedRequestNumber, setCopiedRequestNumber] = useState<string | null>(null)
  const [copiedCharacterId, setCopiedCharacterId] = useState<string | null>(null)
  const [copiedContactInfo, setCopiedContactInfo] = useState<string | null>(null)

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  // Get only the top 5 most recent bookings
  const recentBookings = bookings.slice(0, 5)

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Requested Assistance</CardTitle>
          <CardDescription>You haven't made any assistance requests yet</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Request your first assistance session above</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Requested Assistance</CardTitle>
          <CardDescription>View your recent assistance requests</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/recent">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentBookings.map((booking) => (
            <div
              key={booking._id as string}
              className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-card/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.assistanceTypeName}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-muted-foreground">ID: {booking.characterId}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => copyToClipboard(booking.characterId, "characterId")}
                    >
                      {copiedCharacterId === booking.characterId ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <Copy className="h-2.5 w-2.5" />
                      )}
                    </Button>
                  </div>
                  {booking.contactInfo && (
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{booking.contactInfo}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => copyToClipboard(booking.contactInfo, "contactInfo")}
                      >
                        {copiedContactInfo === booking.contactInfo ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{booking.requestNumber}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(booking.requestNumber, "requestNumber")}
                  >
                    {copiedRequestNumber === booking.requestNumber ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Button variant="outline" size="sm" asChild className="mt-1 relative">
                  <Link href={`/request/${booking._id}`}>
                    View Details
                    {unreadCounts[booking._id as string] > 0 && (
                      <NotificationBadge count={unreadCounts[booking._id as string]} size="sm" className="ml-2" />
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {bookings.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <Link href="/recent">
                View all {bookings.length} requests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
