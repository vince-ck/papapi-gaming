"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Loader2,
  ArrowLeft,
  Search,
  Filter,
  CalendarClock,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  Check,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoginModal } from "@/components/login-modal"
import {
  getAllAssistanceRequests,
  updateRequestStatus,
  bulkUpdateRequestStatus,
  bulkDeleteRequests,
} from "@/actions/admin-assistance"
import type { Booking } from "@/models/assistance"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Add these imports at the top
import { getUnreadCommentsCounts } from "@/actions/comments"
import { NotificationBadge } from "@/components/notification-badge"

export default function AdminAssistanceRequestsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState<Booking[]>([])
  const [filteredRequests, setFilteredRequests] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<Booking | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<"pending" | "confirmed" | "completed" | "cancelled">("pending")

  // New state for bulk operations
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  const [isBulkActionInProgress, setIsBulkActionInProgress] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false)

  // Add this state after the other state declarations
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

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

  // Load assistance requests
  useEffect(() => {
    const loadRequests = async () => {
      if (status !== "authenticated" || session?.user?.role !== "admin") return

      setIsLoading(true)
      try {
        const data = await getAllAssistanceRequests()
        setRequests(data)
        setFilteredRequests(data)

        // Get unread comments counts for all requests
        if (data.length > 0) {
          const requestIds = data.map((request) => request._id?.toString() || "").filter((id) => id)
          const counts = await getUnreadCommentsCounts(requestIds, true) // true for admin view
          setUnreadCounts(counts)
        }
      } catch (error) {
        console.error("Error loading assistance requests:", error)
        setMessage({ type: "error", text: "Failed to load assistance requests" })
      } finally {
        setIsLoading(false)
      }
    }

    loadRequests()
  }, [status, session])

  // Filter requests when search term or status filter changes
  useEffect(() => {
    if (!requests.length) return

    let filtered = [...requests]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (request) =>
          request.requestNumber.toLowerCase().includes(term) ||
          request.characterId.toLowerCase().includes(term) ||
          request.contactInfo.toLowerCase().includes(term) ||
          (request.assistanceTypeName && request.assistanceTypeName.toLowerCase().includes(term)),
      )
    }

    setFilteredRequests(filtered)

    // Clear selected requests when filter changes
    setSelectedRequestIds([])
  }, [searchTerm, statusFilter, requests])

  // Refresh requests
  const handleRefresh = async () => {
    if (status !== "authenticated" || session?.user?.role !== "admin") return

    setIsRefreshing(true)
    setMessage(null)
    try {
      const data = await getAllAssistanceRequests()
      setRequests(data)
      setFilteredRequests(data)

      // Also refresh unread counts
      if (data.length > 0) {
        const requestIds = data.map((request) => request._id?.toString() || "").filter((id) => id)
        const counts = await getUnreadCommentsCounts(requestIds, true)
        setUnreadCounts(counts)
      }

      setMessage({ type: "success", text: "Assistance requests refreshed" })
    } catch (error) {
      console.error("Error refreshing assistance requests:", error)
      setMessage({ type: "error", text: "Failed to refresh assistance requests" })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Open status update dialog
  const openStatusDialog = (request: Booking) => {
    setSelectedRequest(request)
    setNewStatus(request.status)
    setIsStatusDialogOpen(true)
  }

  // Update request status
  const handleStatusUpdate = async () => {
    if (!selectedRequest || !selectedRequest._id) return

    setIsUpdatingStatus(true)
    setMessage(null)
    try {
      const result = await updateRequestStatus(selectedRequest._id.toString(), newStatus)

      if (result.success) {
        // Update the request in the local state
        const updatedRequests = requests.map((req) =>
          req._id === selectedRequest._id ? { ...req, status: newStatus } : req,
        )
        setRequests(updatedRequests)

        // Apply filters to the updated requests
        let filtered = [...updatedRequests]
        if (statusFilter !== "all") {
          filtered = filtered.filter((request) => request.status === statusFilter)
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          filtered = filtered.filter(
            (request) =>
              request.requestNumber.toLowerCase().includes(term) ||
              request.characterId.toLowerCase().includes(term) ||
              request.contactInfo.toLowerCase().includes(term) ||
              (request.assistanceTypeName && request.assistanceTypeName.toLowerCase().includes(term)),
          )
        }
        setFilteredRequests(filtered)

        setMessage({ type: "success", text: result.message })
        setIsStatusDialogOpen(false)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error updating request status:", error)
      setMessage({ type: "error", text: "Failed to update request status" })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    if (selectedRequestIds.length === 0) return

    setIsBulkActionInProgress(true)
    setMessage(null)
    try {
      const result = await bulkUpdateRequestStatus(selectedRequestIds, newStatus)

      if (result.success) {
        // Update the requests in the local state
        const updatedRequests = requests.map((req) =>
          selectedRequestIds.includes(req._id?.toString() || "") ? { ...req, status: newStatus } : req,
        )
        setRequests(updatedRequests)

        // Apply filters to the updated requests
        let filtered = [...updatedRequests]
        if (statusFilter !== "all") {
          filtered = filtered.filter((request) => request.status === statusFilter)
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          filtered = filtered.filter(
            (request) =>
              request.requestNumber.toLowerCase().includes(term) ||
              request.characterId.toLowerCase().includes(term) ||
              request.contactInfo.toLowerCase().includes(term) ||
              (request.assistanceTypeName && request.assistanceTypeName.toLowerCase().includes(term)),
          )
        }
        setFilteredRequests(filtered)

        setMessage({ type: "success", text: result.message })
        setIsBulkStatusDialogOpen(false)
        setSelectedRequestIds([])
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error bulk updating request status:", error)
      setMessage({ type: "error", text: "Failed to update request status" })
    } finally {
      setIsBulkActionInProgress(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    // If we have a selected request but no selected IDs, we're deleting a single request
    const idsToDelete =
      selectedRequest && selectedRequestIds.length === 0 ? [selectedRequest._id?.toString() || ""] : selectedRequestIds

    if (idsToDelete.length === 0) return

    setIsBulkActionInProgress(true)
    setMessage(null)
    try {
      const result = await bulkDeleteRequests(idsToDelete)

      if (result.success) {
        // Remove the deleted requests from the local state
        const remainingRequests = requests.filter((req) => !idsToDelete.includes(req._id?.toString() || ""))
        setRequests(remainingRequests)

        // Apply filters to the updated requests
        let filtered = [...remainingRequests]
        if (statusFilter !== "all") {
          filtered = filtered.filter((request) => request.status === statusFilter)
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          filtered = filtered.filter(
            (request) =>
              request.requestNumber.toLowerCase().includes(term) ||
              request.characterId.toLowerCase().includes(term) ||
              request.contactInfo.toLowerCase().includes(term) ||
              (request.assistanceTypeName && request.assistanceTypeName.toLowerCase().includes(term)),
          )
        }
        setFilteredRequests(filtered)

        setMessage({ type: "success", text: result.message })
        setIsBulkDeleteDialogOpen(false)
        setSelectedRequestIds([])
        setSelectedRequest(null)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error deleting requests:", error)
      setMessage({ type: "error", text: "Failed to delete requests" })
    } finally {
      setIsBulkActionInProgress(false)
    }
  }

  // Toggle select all requests
  const toggleSelectAll = () => {
    if (selectedRequestIds.length === filteredRequests.length) {
      // If all are selected, deselect all
      setSelectedRequestIds([])
    } else {
      // Otherwise, select all
      setSelectedRequestIds(filteredRequests.map((req) => req._id?.toString() || "").filter((id) => id))
    }
  }

  // Toggle select a single request
  const toggleSelectRequest = (id: string) => {
    if (!id) return

    setSelectedRequestIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((requestId) => requestId !== id)
      } else {
        return [...prev, id]
      }
    })
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
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "confirmed":
        return <CalendarClock className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
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

  // Format selected days for display
  const formatSelectedDays = (days: string[] | undefined): string => {
    if (!days || !Array.isArray(days) || days.length === 0) return "No days selected"
    if (days.length === 7) return "Every day"

    const dayLabels: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    }

    return days.map((day) => dayLabels[day] || day).join(", ")
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
          <h1 className="text-3xl font-bold tracking-tight">Assistance Requests</h1>
          <p className="text-muted-foreground">Manage all user assistance requests</p>
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

      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by request number, character ID, or contact info..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Debug info - remove in production */}
          {selectedRequestIds.length > 0 && (
            <div className="mb-2 text-xs text-muted-foreground">Selected IDs: {selectedRequestIds.length} items</div>
          )}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No assistance requests found</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedRequestIds.length > 0 && (
                <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-1 rounded-full">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{selectedRequestIds.length} requests selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsBulkStatusDialogOpen(true)}
                      disabled={isBulkActionInProgress}
                      className="flex-1 sm:flex-none"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Update Status
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setIsBulkDeleteDialogOpen(true)}
                      disabled={isBulkActionInProgress}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedRequestIds.length === filteredRequests.length && filteredRequests.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all requests"
                        className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                    </TableHead>
                    <TableHead>Request #</TableHead>
                    <TableHead>Character ID</TableHead>
                    <TableHead>Assistance Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>

                  {filteredRequests.map((request) => {
                    const requestId = request._id?.toString() || ""
                    const unreadCount = unreadCounts[requestId] || 0
                    const hasUnreadComments = unreadCount > 0

                    return (
                      <TableRow
                        key={requestId}
                        className={hasUnreadComments ? "bg-primary/5 border-l-2 border-l-primary" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRequestIds.includes(requestId)}
                            onCheckedChange={() => toggleSelectRequest(requestId)}
                            aria-label={`Select request ${request.requestNumber}`}
                            className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{request.requestNumber}</TableCell>
                        <TableCell>{request.characterId}</TableCell>
                        <TableCell>{request.assistanceTypeName}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{formatSelectedDays(request.selectedDays)}</div>
                            <div>
                              {request.timeRangePreset === "custom"
                                ? `${formatTime(request.startTime)} - ${formatTime(request.endTime)}`
                                : request.timeRangePreset}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            {getStatusBadge(request.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.createdAt ? format(new Date(request.createdAt), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className={`h-8 ${hasUnreadComments ? "border-primary text-primary hover:bg-primary/10" : ""}`}
                            >
                              <Link href={`/request/${requestId}`} className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                View Details
                                {hasUnreadComments && (
                                  <NotificationBadge count={unreadCount} size="sm" className="ml-2" />
                                )}
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openStatusDialog(request)}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setIsBulkDeleteDialogOpen(true)
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </Table>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        </CardFooter>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>Change the status for request #{selectedRequest?.requestNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Status:</p>
              <div className="flex items-center gap-2">
                {selectedRequest && getStatusIcon(selectedRequest.status)}
                {selectedRequest && getStatusBadge(selectedRequest.status)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">New Status:</p>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Request Status</DialogTitle>
            <DialogDescription>Change the status for {selectedRequestIds.length} selected requests</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">New Status:</p>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkStatusDialogOpen(false)}
              disabled={isBulkActionInProgress}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={isBulkActionInProgress}>
              {isBulkActionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest && selectedRequestIds.length === 0 ? "Delete Request" : "Delete Requests"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && selectedRequestIds.length === 0
                ? `Are you sure you want to delete request #${selectedRequest.requestNumber}? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedRequestIds.length} selected requests? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={isBulkActionInProgress}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActionInProgress}>
              {isBulkActionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Requests"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    </div>
  )
}
