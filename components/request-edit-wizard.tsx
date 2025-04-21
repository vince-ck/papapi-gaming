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

  // Direct DOM references for problematic fields
  const additionalInfoRef = useRef<HTMLTextAreaElement>(null)

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

  // Handle photo URLs change
  const handlePhotoUrlsChange = (urls: string[]) => {
    // Ensure urls is an array
    const safeUrls = Array.isArray(urls) ? urls : []
    setPhotoUrls(safeUrls)
    form.setValue("photoUrls", safeUrls)
    // Remove the immediate save call
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
    // Remove the immediate save call
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
      // Remove the immediate save call
    } else {
      // Clear all days
      form.setValue("selectedDays", [])
      // Remove the immediate save call
    }
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
    // Remove the immediate save call
  }

  // Handle slots change
  const handleSlotsChange = (newValue: number, e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    form.setValue("slots", newValue)
    // Remove the immediate save call
  }

  // Handle donation preference change
  const handleDonationChange = (value: "yes" | "no", e?: React.MouseEvent) => {
    // Prevent event propagation
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    form.setValue("willingToDonate", value)
    // Remove the immediate save call
  }

  // Handle additional info change
  const handleAdditionalInfoChange = () => {
    if (additionalInfoRef.current) {
      const value = additionalInfoRef.current.value
      form.setValue("additionalInfo", value)
      // Remove the immediate save call
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
    // Remove the immediate save call
  }

  // Save changes to the server
  const handleSaveChanges = async (specificChanges?: Partial<FormValues>) => {
    if (!booking._id) return

    setIsSaving(true)
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
        // Show success message for longer (3 seconds)
        setMessage({ type: "success", text: "Changes saved successfully" })

        // Clear message after a longer delay
        setTimeout(() => {
          setMessage(null)
        }, 3000)

        // Update local booking data
        onSuccess(result.booking)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error updating booking:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-none overflow-visible">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          <span>Edit Request</span>
        </CardTitle>
        <CardDescription>Update your assistance request details</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Show messages */}
        {message && (
          <Alert
            variant={message.type === "success" ? "default" : "destructive"}
            className={`mb-4 ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30" : ""}`}
          >
            <div className="flex items-center">
              {message.type === "success" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-green-600 dark:text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Add a fixed height container for the message area to prevent layout shifts */}
        {!message && <div className="h-[56px]"></div>}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 p-1 rounded-lg bg-muted/30">
            <TabsTrigger
              value="details"
              className="py-3 relative data-[state=active]:text-primary data-[state=active]:font-medium"
            >
              Customer Details
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 transition-transform data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger
              value="assistance"
              className="py-3 relative data-[state=active]:text-primary data-[state=active]:font-medium"
            >
              Assistance Info
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 transition-transform data-[state=active]:scale-x-100" />
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="py-3 relative data-[state=active]:text-primary data-[state=active]:font-medium"
              disabled={selectedAssistanceType?.allowSchedule === false}
            >
              Schedule
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 transition-transform data-[state=active]:scale-x-100" />
            </TabsTrigger>
          </TabsList>

          {/* This container will maintain consistent height */}
          <div className="min-h-[650px] relative">
            <Form {...form}>
              {/* Customer Details Tab */}
              <TabsContent
                value="details"
                className="absolute top-0 left-0 w-full p-4 space-y-6 transition-opacity duration-300 overflow-visible"
                style={{
                  opacity: activeTab === "details" ? 1 : 0,
                  pointerEvents: activeTab === "details" ? "auto" : "none",
                  zIndex: activeTab === "details" ? 1 : 0,
                }}
              >
                <div className="space-y-6">
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
                        <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 shadow-sm">
                          <FormLabel className="text-lg font-medium flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                            <span>Support Our Service</span>
                          </FormLabel>
                          <FormDescription className="mt-1 mb-3 text-sm">
                            Your donation helps us maintain and improve our assistance services. Donors receive priority
                            scheduling and enhanced support.
                          </FormDescription>
                          <FormControl>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <label
                                className={`flex-1 flex items-center justify-center p-4 rounded-md border-2 cursor-pointer transition-all ${
                                  field.value === "yes"
                                    ? "bg-primary/20 border-primary text-primary font-medium shadow-md scale-[1.02]"
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
                                  className={`mr-2 h-5 w-5 ${field.value === "yes" ? "text-red-500 fill-red-500" : ""}`}
                                />
                                <span onClick={(e) => e.stopPropagation()}>Yes, I'm willing to donate</span>
                              </label>
                              <label
                                className={`flex-1 flex items-center justify-center p-4 rounded-md border-2 cursor-pointer transition-all ${
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
                              </label>
                            </div>
                          </FormControl>
                          <div className="mt-3 text-xs text-muted-foreground italic">
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
                className="absolute top-0 left-0 w-full p-4 space-y-6 transition-opacity duration-300 overflow-visible"
                style={{
                  opacity: activeTab === "assistance" ? 1 : 0,
                  pointerEvents: activeTab === "assistance" ? "auto" : "none",
                  zIndex: activeTab === "assistance" ? 1 : 0,
                }}
              >
                <div className="space-y-6">
                  <div>
                    <FormLabel htmlFor="additionalInfo" className="text-base font-medium">
                      Additional Information
                    </FormLabel>
                    <div className="flex items-start">
                      <Info className="mr-2 h-4 w-4 mt-2 text-muted-foreground" />
                      <textarea
                        ref={additionalInfoRef}
                        id="additionalInfo"
                        className="min-h-[150px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="absolute top-0 left-0 w-full p-4 space-y-6 transition-opacity duration-300 overflow-visible"
                style={{
                  opacity: activeTab === "schedule" ? 1 : 0,
                  pointerEvents: activeTab === "schedule" ? "auto" : "none",
                  zIndex: activeTab === "schedule" ? 1 : 0,
                }}
              >
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="selectedDays"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="text-base font-medium">
                            Days of The Week <span className="text-destructive">*</span>
                          </FormLabel>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectAllDays}
                              onChange={(e) => handleSelectAllDays(e.target.checked, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                            />
                            <span onClick={(e) => e.stopPropagation()}>Select All</span>
                          </label>
                        </div>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <label
                                key={day.id}
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
                              </label>
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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(TIME_RANGES).map(([key, range]) => (
                              <label
                                key={key}
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
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormDescription>Select your preferred time range</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedTimeRange === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
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
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="rounded-r-none"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const newValue = Math.max(1, field.value - 1)
                                handleSlotsChange(newValue, e)
                              }}
                              disabled={field.value <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div
                              className="flex-1 border-y border-input bg-background px-3 py-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {field.value} {field.value === 1 ? "slot" : "slots"}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="rounded-l-none"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const newValue = Math.min(4, field.value + 1)
                                handleSlotsChange(newValue, e)
                              }}
                              disabled={field.value >= 4}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
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
      </CardContent>
      <CardFooter className="flex justify-between py-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {activeTab !== "details" && (
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to previous tab
                if (activeTab === "assistance") setActiveTab("details")
                else if (activeTab === "schedule") setActiveTab("assistance")
              }}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save button - always visible, saves current changes */}
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleSaveChanges()}>
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

          {/* Save & Next button - not shown on last tab if scheduling is disabled */}
          {activeTab !== "schedule" && selectedAssistanceType?.allowSchedule !== false ? (
            <Button
              onClick={async () => {
                // First save changes
                await handleSaveChanges()
                // Then navigate to next tab
                if (activeTab === "details") setActiveTab("assistance")
                else if (activeTab === "assistance") setActiveTab("schedule")
              }}
            >
              Save & Next
            </Button>
          ) : (
            <Button type="button" disabled={isSaving} onClick={() => handleSaveChanges()} className="px-6">
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
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
