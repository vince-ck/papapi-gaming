"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Loader2,
  Gamepad2,
  Mail,
  Minus,
  Plus,
  CalendarRange,
  Heart,
  ImageIcon,
  Info,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllAssistanceTypes, updateBooking } from "@/actions/request-details"
import type { AssistanceType, Booking } from "@/models/assistance"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MultiFileUpload } from "@/components/multi-file-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Form schema
const formSchema = z.object({
  characterId: z.string().regex(/^\d+$/, {
    message: "Character ID must contain only numbers",
  }),
  contactInfo: z.string().min(1, {
    message: "Contact information is required",
  }),
  assistanceTypeId: z.string({
    required_error: "Please select an assistance type",
  }),
  additionalInfo: z.string().min(1, {
    message: "Additional information is required",
  }),
  selectedDays: z.array(z.string()).min(1, {
    message: "Please select at least one day",
  }),
  timeRangePreset: z.enum(["early", "middle", "late", "custom"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  slots: z.number().min(1).max(4),
  willingToDonate: z.enum(["yes", "no"]),
})

type FormValues = z.infer<typeof formSchema>

// Days of the week
const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
]

// Predefined time ranges
const TIME_RANGES = {
  early: {
    label: "Early (5:00 - 10:00)",
    startTime: "05:00",
    endTime: "10:00",
  },
  middle: {
    label: "Midday (10:00 - 14:00)",
    startTime: "10:00",
    endTime: "14:00",
  },
  late: {
    label: "Late (14:00 - 19:00)",
    startTime: "14:00",
    endTime: "19:00",
  },
  custom: {
    label: "Custom Time Range",
    startTime: "",
    endTime: "",
  },
}

// Generate time options (30 min intervals)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      const time = `${formattedHour}:${formattedMinute}`
      options.push(time)
    }
  }
  return options
}

interface RequestEditWizardProps {
  booking: Booking
  onCancel: () => void
  onSuccess: (updatedBooking: Booking) => void
}

export function RequestEditWizard({ booking, onCancel, onSuccess }: RequestEditWizardProps) {
  const router = useRouter()
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>(booking.photoUrls || [])
  const [activeTab, setActiveTab] = useState("details")
  const [selectedTimeRange, setSelectedTimeRange] = useState<"early" | "middle" | "late" | "custom">(
    booking.timeRangePreset || "early",
  )
  const [timeOptions] = useState(generateTimeOptions())
  const [selectAllDays, setSelectAllDays] = useState(booking.selectedDays?.length === 7)
  const [selectedAssistanceType, setSelectedAssistanceType] = useState<AssistanceType | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // Direct DOM references for problematic fields
  const additionalInfoRef = useRef<HTMLTextAreaElement>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)

  // Initialize form with booking data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      characterId: booking.characterId || "",
      contactInfo: booking.contactInfo || "",
      assistanceTypeId: booking.assistanceTypeId?.toString() || "",
      additionalInfo: booking.additionalInfo || "",
      selectedDays: booking.selectedDays || [],
      timeRangePreset: booking.timeRangePreset || "early",
      startTime: booking.startTime || TIME_RANGES.early.startTime,
      endTime: booking.endTime || TIME_RANGES.early.endTime,
      photoUrls: booking.photoUrls || [],
      slots: booking.slots || 1,
      willingToDonate: booking.willingToDonate || "no",
    },
  })

  // Load assistance types
  useEffect(() => {
    const loadAssistanceTypes = async () => {
      setIsLoading(true)
      try {
        const types = await getAllAssistanceTypes()
        setAssistanceTypes(types)

        // Find the selected assistance type
        const selectedType = types.find((type) => type._id?.toString() === booking.assistanceTypeId?.toString())
        setSelectedAssistanceType(selectedType || null)
      } catch (error) {
        console.error("Error loading assistance types:", error)
        setMessage({ type: "error", text: "Failed to load assistance types" })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssistanceTypes()
  }, [booking.assistanceTypeId])

  // Auto-save functionality with debounce
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (autoSaveStatus === "saving") {
        handleSaveChanges(undefined, true)
      }
    }, 2000)

    return () => clearTimeout(autoSaveTimer)
  }, [autoSaveStatus])

  // Handle photo URLs change
  const handlePhotoUrlsChange = (urls: string[]) => {
    // Ensure urls is an array
    const safeUrls = Array.isArray(urls) ? urls : []
    setPhotoUrls(safeUrls)
    form.setValue("photoUrls", safeUrls)
    setAutoSaveStatus("saving")
  }

  // Handle time range selection
  const handleTimeRangeChange = (value: "early" | "middle" | "late" | "custom", e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    setSelectedTimeRange(value)
    form.setValue("timeRangePreset", value)

    if (value !== "custom") {
      const range = TIME_RANGES[value]
      form.setValue("startTime", range.startTime)
      form.setValue("endTime", range.endTime)
    }
    setAutoSaveStatus("saving")
  }

  // Format time string to AM/PM format
  const formatTime = (timeString: string): string => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  // Handle select all days
  const handleSelectAllDays = (checked: boolean, e?: React.MouseEvent | React.ChangeEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      if ("preventDefault" in e) e.preventDefault()
    }

    setSelectAllDays(checked)
    if (checked) {
      // Select all days
      const allDays = DAYS_OF_WEEK.map((day) => day.id)
      form.setValue("selectedDays", allDays)
    } else {
      // Clear all days
      form.setValue("selectedDays", [])
    }
    setAutoSaveStatus("saving")
  }

  // Handle day selection change
  const handleDayChange = (day: string, checked: boolean, e?: React.MouseEvent | React.ChangeEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      if ("preventDefault" in e) e.preventDefault()
    }

    const currentDays = form.getValues("selectedDays") || []
    let newDays: string[]

    if (checked) {
      newDays = [...currentDays, day]
    } else {
      newDays = currentDays.filter((d) => d !== day)
    }

    form.setValue("selectedDays", newDays)

    // Update selectAllDays state
    setSelectAllDays(newDays.length === DAYS_OF_WEEK.length)
    setAutoSaveStatus("saving")
  }

  // Handle slots change
  const handleSlotsChange = (newValue: number, e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    form.setValue("slots", newValue)
    setAutoSaveStatus("saving")
  }

  // Handle donation preference change
  const handleDonationChange = (value: "yes" | "no", e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    form.setValue("willingToDonate", value)
    setAutoSaveStatus("saving")
  }

  // Handle additional info change
  const handleAdditionalInfoChange = () => {
    if (additionalInfoRef.current) {
      const value = additionalInfoRef.current.value
      form.setValue("additionalInfo", value)
      setAutoSaveStatus("saving")
    }
  }

  // Handle time selection change
  const handleTimeChange = (field: "startTime" | "endTime", value: string, e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      if (e.preventDefault) e.preventDefault()
    }

    form.setValue(field, value)
    setAutoSaveStatus("saving")
  }

  // Handle tab change with smooth scrolling for mobile
  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // On mobile, scroll to top of form when changing tabs
    if (isMobile && formContainerRef.current) {
      setTimeout(() => {
        formContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }

  // Save changes to the server
  const handleSaveChanges = async (specificChanges?: Partial<FormValues>, isAutoSave = false) => {
    if (!booking._id) return

    if (!isAutoSave) {
      setIsSaving(true)
    } else {
      setAutoSaveStatus("saving")
    }

    setMessage(null)

    try {
      // Get current form values
      const values = form.getValues()

      // Prepare update data
      const updateData: Partial<Booking> = {
        // Use specific changes if provided, otherwise use all form values
        ...(specificChanges || {
          additionalInfo: additionalInfoRef.current?.value || values.additionalInfo,
          selectedDays: values.selectedDays,
          timeRangePreset: values.timeRangePreset,
          startTime: values.startTime,
          endTime: values.endTime,
          slots: values.slots,
          willingToDonate: values.willingToDonate,
          photoUrls: photoUrls,
        }),
      }

      // Update booking
      const result = await updateBooking(booking._id.toString(), updateData)

      if (result.success && result.booking) {
        setLastSaved(new Date())

        if (isAutoSave) {
          setAutoSaveStatus("saved")
          // Reset to idle after showing saved status
          setTimeout(() => setAutoSaveStatus("idle"), 2000)
        } else {
          // Show success message for longer (3 seconds)
          setMessage({ type: "success", text: "Changes saved successfully" })

          // Clear message after a longer delay
          setTimeout(() => {
            setMessage(null)
          }, 3000)
        }

        // Update local booking data
        onSuccess(result.booking)
      } else {
        if (isAutoSave) {
          setAutoSaveStatus("error")
          // Reset to idle after showing error status
          setTimeout(() => setAutoSaveStatus("idle"), 2000)
        } else {
          setMessage({ type: "error", text: result.message })
        }
      }
    } catch (error) {
      console.error("Error updating booking:", error)
      if (isAutoSave) {
        setAutoSaveStatus("error")
        setTimeout(() => setAutoSaveStatus("idle"), 2000)
      } else {
        setMessage({ type: "error", text: "An unexpected error occurred" })
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false)
      }
    }
  }

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null

    const now = new Date()
    const diffMs = now.getTime() - lastSaved.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) {
      return "just now"
    } else if (diffMins === 1) {
      return "1 minute ago"
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`
    } else {
      const hours = Math.floor(diffMins / 60)
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
    }
  }

  return (
    <Card className="w-full max-w-none overflow-visible">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <CalendarRange className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span>Edit Request</span>
        </CardTitle>
        <CardDescription>Update your assistance request details</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Auto-save indicator */}
        <div className="h-8 mb-2 flex items-center justify-between">
          <div>
            <AnimatePresence mode="wait">
              {autoSaveStatus === "saving" && (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center text-xs text-muted-foreground"
                >
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving changes...
                </motion.div>
              )}

              {autoSaveStatus === "saved" && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center text-xs text-green-600 dark:text-green-400"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Changes saved
                </motion.div>
              )}

              {autoSaveStatus === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center text-xs text-red-600 dark:text-red-400"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed to save changes
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {lastSaved && <div className="text-xs text-muted-foreground">Last saved: {formatLastSaved()}</div>}
        </div>

        {/* Show messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Alert
                variant={message.type === "success" ? "default" : "destructive"}
                className={`mb-4 ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30" : ""}`}
              >
                <div className="flex items-center">
                  {message.type === "success" && (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                  )}
                  <AlertDescription>{message.text}</AlertDescription>
                </div>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={formContainerRef}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 p-1 rounded-lg bg-muted/30">
              <TabsTrigger
                value="details"
                className="py-3 relative data-[state=active]:text-accent data-[state=active]:font-medium"
              >
                Customer Details
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent origin-left scale-x-0 transition-transform data-[state=active]:scale-x-100" />
              </TabsTrigger>
              <TabsTrigger
                value="assistance"
                className="py-3 relative data-[state=active]:text-accent data-[state=active]:font-medium"
              >
                Assistance Info
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent origin-left scale-x-0 transition-transform data-[state=active]:scale-x-100" />
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="py-3 relative data-[state=active]:text-accent data-[state=active]:font-medium"
                disabled={selectedAssistanceType?.allowSchedule === false}
              >
                Schedule
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent origin-left scale-x-0 transition-transform data-[state=active]:scale-x-100" />
              </TabsTrigger>
            </TabsList>

            {/* This container will maintain consistent height */}
            <div className="min-h-[500px] sm:min-h-[650px] relative">
              <Form {...form}>
                {/* Customer Details Tab */}
                <TabsContent
                  value="details"
                  className="absolute top-0 left-0 w-full p-2 sm:p-4 space-y-4 sm:space-y-6 transition-all duration-300 overflow-visible"
                  style={{
                    opacity: activeTab === "details" ? 1 : 0,
                    pointerEvents: activeTab === "details" ? "auto" : "none",
                    zIndex: activeTab === "details" ? 1 : 0,
                  }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <FormLabel htmlFor="characterId" className="text-base font-medium">
                        Character ID
                      </FormLabel>
                      <div className="flex items-center">
                        <Gamepad2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="characterId"
                          type="text"
                          className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={booking.characterId}
                          disabled
                        />
                      </div>
                      <FormDescription>Your in-game character ID (cannot be changed)</FormDescription>
                    </div>

                    <div>
                      <FormLabel htmlFor="contactInfo" className="text-base font-medium">
                        Contact Information
                      </FormLabel>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="contactInfo"
                          type="text"
                          className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={booking.contactInfo}
                          disabled
                        />
                      </div>
                      <FormDescription>Your contact details (cannot be changed)</FormDescription>
                    </div>

                    <div>
                      <FormLabel htmlFor="assistanceType" className="text-base font-medium">
                        What assistance do you need?
                      </FormLabel>
                      <div className="flex items-center">
                        <Select disabled value={form.getValues("assistanceTypeId")}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {assistanceTypes.find(
                                  (type) => type._id?.toString() === form.getValues("assistanceTypeId"),
                                )?.name || "Loading..."}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assistanceTypes.map((type) => (
                              <SelectItem key={type._id as string} value={type._id as string}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormDescription>Assistance type cannot be changed after creation</FormDescription>
                    </div>

                    <FormField
                      control={form.control}
                      name="willingToDonate"
                      render={({ field }) => (
                        <FormItem>
                          <div className="border-2 border-primary/30 rounded-lg p-3 sm:p-4 bg-primary/5 shadow-sm">
                            <FormLabel className="text-base sm:text-lg font-medium flex items-center gap-2">
                              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 fill-red-500" />
                              <span>Support Our Service</span>
                            </FormLabel>
                            <FormDescription className="mt-1 mb-2 sm:mb-3 text-xs sm:text-sm">
                              Your donation helps us maintain and improve our assistance services. Donors receive
                              priority scheduling and enhanced support.
                            </FormDescription>
                            <FormControl>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <motion.label
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex-1 flex items-center justify-center p-3 sm:p-4 rounded-md border-2 cursor-pointer transition-all ${
                                    field.value === "yes"
                                      ? "bg-primary/20 border-primary text-primary font-medium shadow-md"
                                      : "bg-background border-input hover:bg-muted/50 hover:border-primary/50"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    value="yes"
                                    checked={field.value === "yes"}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleDonationChange("yes", e)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Heart
                                    className={`mr-2 h-4 w-4 ${field.value === "yes" ? "text-red-500 fill-red-500" : ""}`}
                                  />
                                  <span onClick={(e) => e.stopPropagation()}>Yes, I'm willing to donate</span>
                                </motion.label>
                                <motion.label
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex-1 flex items-center justify-center p-3 sm:p-4 rounded-md border-2 cursor-pointer transition-all ${
                                    field.value === "no"
                                      ? "bg-background/90 border-gray-400 text-foreground font-medium shadow-sm"
                                      : "bg-background border-input hover:bg-muted/50"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    value="no"
                                    checked={field.value === "no"}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleDonationChange("no", e)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span onClick={(e) => e.stopPropagation()}>No, I don't have intention to donate</span>
                                </motion.label>
                              </div>
                            </FormControl>
                            <div className="mt-2 sm:mt-3 text-xs text-muted-foreground italic">
                              Note: Donations are completely optional and you may still receive assistance.
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Assistance Info Tab */}
                <TabsContent
                  value="assistance"
                  className="absolute top-0 left-0 w-full p-2 sm:p-4 space-y-4 sm:space-y-6 transition-all duration-300 overflow-visible"
                  style={{
                    opacity: activeTab === "assistance" ? 1 : 0,
                    pointerEvents: activeTab === "assistance" ? "auto" : "none",
                    zIndex: activeTab === "assistance" ? 1 : 0,
                  }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <FormLabel htmlFor="additionalInfo" className="text-base font-medium">
                        Additional Information
                      </FormLabel>
                      <div className="flex items-start">
                        <Info className="mr-2 h-4 w-4 mt-2 text-muted-foreground" />
                        <textarea
                          ref={additionalInfoRef}
                          id="additionalInfo"
                          className="min-h-[120px] sm:min-h-[150px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          placeholder="Provide details about your request..."
                          defaultValue={form.getValues("additionalInfo")}
                          onBlur={handleAdditionalInfoChange}
                        />
                      </div>
                      <FormDescription>Include specific requirements or questions about your request</FormDescription>
                      {additionalInfoRef.current && additionalInfoRef.current.value === "" && (
                        <p className="text-sm font-medium text-destructive">Additional information is required</p>
                      )}
                    </div>

                    {selectedAssistanceType?.allowPhotoUpload && (
                      <FormField
                        control={form.control}
                        name="photoUrls"
                        render={() => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Photo Attachments</FormLabel>
                            <FormControl>
                              <div className="flex items-start">
                                <ImageIcon className="mr-2 h-4 w-4 mt-2 text-muted-foreground" />
                                <div className="flex-1">
                                  <MultiFileUpload
                                    maxFiles={2}
                                    maxSizeMB={5}
                                    onChange={handlePhotoUrlsChange}
                                    value={photoUrls}
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Upload screenshots or images related to your request (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent
                  value="schedule"
                  className="absolute top-0 left-0 w-full p-2 sm:p-4 space-y-4 sm:space-y-6 transition-all duration-300 overflow-visible"
                  style={{
                    opacity: activeTab === "schedule" ? 1 : 0,
                    pointerEvents: activeTab === "schedule" ? "auto" : "none",
                    zIndex: activeTab === "schedule" ? 1 : 0,
                  }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    <FormField
                      control={form.control}
                      name="selectedDays"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center mb-2">
                            <FormLabel className="text-base font-medium">
                              Days of The Week <span className="text-destructive">*</span>
                            </FormLabel>
                            <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectAllDays}
                                onChange={(e) => handleSelectAllDays(e.target.checked, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-input h-3 w-3 sm:h-4 sm:w-4 text-primary focus:ring-primary"
                              />
                              <span onClick={(e) => e.stopPropagation()}>Select All</span>
                            </label>
                          </div>
                          <FormControl>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <motion.label
                                  key={day.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors ${
                                    field.value?.includes(day.id)
                                      ? "bg-primary/10 border-primary text-primary"
                                      : "bg-background border-input hover:bg-muted/50"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    value={day.id}
                                    checked={field.value?.includes(day.id)}
                                    onChange={(e) => handleDayChange(day.id, e.target.checked, e)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span onClick={(e) => e.stopPropagation()}>{day.label}</span>
                                </motion.label>
                              ))}
                            </div>
                          </FormControl>
                          <FormDescription>Select at least one day you're available for assistance</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeRangePreset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Time of The Day</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {Object.entries(TIME_RANGES).map(([key, range]) => (
                                <motion.label
                                  key={key}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors ${
                                    field.value === key
                                      ? "bg-primary/10 border-primary text-primary"
                                      : "bg-background border-input hover:bg-muted/50"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    value={key}
                                    checked={field.value === key}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      field.onChange(key)
                                      handleTimeRangeChange(key as "early" | "middle" | "late" | "custom", e)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span onClick={(e) => e.stopPropagation()}>{range.label}</span>
                                </motion.label>
                              ))}
                            </div>
                          </FormControl>
                          <FormDescription>Select your preferred time range</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedTimeRange === "custom" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Start Time</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value)
                                  handleTimeChange("startTime", value)
                                }}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select start time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={`start-${time}`} value={time}>
                                      {formatTime(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">End Time</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value)
                                  handleTimeChange("endTime", value)
                                }}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select end time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={`end-${time}`} value={time}>
                                      {formatTime(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="slots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">How many slots do you need?</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex h-10 w-10 items-center justify-center rounded-l-md border border-input bg-background hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  const newValue = Math.max(1, field.value - 1)
                                  handleSlotsChange(newValue, e)
                                }}
                                disabled={field.value <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </motion.button>
                              <div
                                className="flex-1 h-10 flex items-center justify-center border-y border-input bg-background px-3 py-2 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {field.value} {field.value === 1 ? "slot" : "slots"}
                              </div>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex h-10 w-10 items-center justify-center rounded-r-md border border-input bg-background hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  const newValue = Math.min(4, field.value + 1)
                                  handleSlotsChange(newValue, e)
                                }}
                                disabled={field.value >= 4}
                              >
                                <Plus className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </FormControl>
                          <FormDescription>Increase slots if you wish to invite friends to the party</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Form>
            </div>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 py-4 sm:py-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Return to request details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {activeTab !== "details" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Navigate to previous tab
                      if (activeTab === "assistance") handleTabChange("details")
                      else if (activeTab === "schedule") handleTabChange("assistance")
                    }}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Go to previous section</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Save button - always visible, saves current changes */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => handleSaveChanges()}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save changes without changing tab</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Save & Next button - not shown on last tab if scheduling is disabled */}
          {activeTab !== "schedule" && selectedAssistanceType?.allowSchedule !== false ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={async () => {
                      // First save changes
                      await handleSaveChanges()
                      // Then navigate to next tab
                      if (activeTab === "details") handleTabChange("assistance")
                      else if (activeTab === "assistance") handleTabChange("schedule")
                    }}
                    className="w-full sm:w-auto"
                  >
                    Save & Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save changes and go to next section</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveChanges()}
                    className="w-full sm:w-auto px-4 sm:px-6"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save all changes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
