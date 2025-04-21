"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Loader2,
  Gamepad2,
  Mail,
  CheckCircle,
  Copy,
  Check,
  Minus,
  Plus,
  CalendarRange,
  Heart,
  ImageIcon,
  Info,
} from "lucide-react"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAssistanceTypes, createBooking, initializeAssistanceTypes, getBookings } from "@/actions/assistance"
import { FormWizard } from "@/components/form-wizard"
import type { AssistanceType } from "@/models/assistance"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MultiFileUpload } from "@/components/multi-file-upload"
import React from "react"
import Link from "next/link"

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

export function BookingWizard() {
  const router = useRouter()
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<"early" | "middle" | "late" | "custom">("early")
  const [timeOptions] = useState(generateTimeOptions())
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState(false)
  const [selectAllDays, setSelectAllDays] = useState(false)
  const [selectedAssistanceType, setSelectedAssistanceType] = useState<AssistanceType | null>(null)
  const [booking, setBooking] = useState<any | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  // Direct DOM references for problematic fields
  const characterIdRef = useRef<HTMLInputElement>(null)
  const contactInfoRef = useRef<HTMLInputElement>(null)
  const additionalInfoRef = useRef<HTMLTextAreaElement>(null)

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      characterId: "",
      contactInfo: "",
      assistanceTypeId: "", // Removed default value
      additionalInfo: "",
      selectedDays: [],
      timeRangePreset: "early",
      startTime: TIME_RANGES.early.startTime,
      endTime: TIME_RANGES.early.endTime,
      photoUrls: [],
      slots: 1,
      willingToDonate: "no", // Set a default value
    },
  })

  // Load cached values from localStorage
  useEffect(() => {
    const cachedCharacterId = localStorage.getItem("papapi-characterId") || ""
    const cachedContactInfo = localStorage.getItem("papapi-contactInfo") || ""

    if (cachedCharacterId) {
      form.setValue("characterId", cachedCharacterId)
      if (characterIdRef.current) {
        characterIdRef.current.value = cachedCharacterId
      }
    }

    if (cachedContactInfo) {
      form.setValue("contactInfo", cachedContactInfo)
      if (contactInfoRef.current) {
        contactInfoRef.current.value = cachedContactInfo
      }
    }
  }, [form])

  // Save values to localStorage
  const saveToLocalStorage = (field: string, value: string) => {
    localStorage.setItem(`papapi-${field}`, value)
  }

  // Define base wizard steps
  const baseSteps = [
    {
      id: "character",
      title: "Customer Details",
      description: "Enter your character and contact information",
    },
    {
      id: "assistance",
      title: "Assistance Info",
      description: "Provide more details about your request",
    },
    {
      id: "schedule",
      title: "Schedule",
      description: "Pick a Date & Time That Works for You",
    },
    {
      id: "review",
      title: "Review",
      description: "Review your request before submitting",
    },
  ]

  // Dynamically filter steps based on scheduling availability
  const steps = React.useMemo(() => {
    if (!selectedAssistanceType) return baseSteps

    // If scheduling is disabled, remove the schedule step
    if (selectedAssistanceType.allowSchedule === false) {
      return baseSteps.filter((step) => step.id !== "schedule")
    }

    return baseSteps
  }, [selectedAssistanceType])

  // Get the actual step index based on the filtered steps
  const getActualStepIndex = (stepIndex: number): number => {
    // If scheduling is disabled and we're past the assistance info step
    if (selectedAssistanceType?.allowSchedule === false && stepIndex >= 2) {
      // Skip the schedule step (index 2)
      return stepIndex + 1
    }
    return stepIndex
  }

  // Check if current step is valid
  const isStepValid = () => {
    // Get the actual step in the base steps array
    const actualStep = getActualStepIndex(currentStep)

    // Check if there are any errors in the current step's fields
    switch (actualStep) {
      case 0: // Character step and assistance type
        const characterId = characterIdRef.current?.value || ""
        const contactInfo = contactInfoRef.current?.value || ""
        const assistanceTypeId = form.getValues("assistanceTypeId")

        return /^\d+$/.test(characterId) && contactInfo.trim().length > 0 && assistanceTypeId?.trim().length > 0
      case 1: // Additional info step
        const additionalInfo = additionalInfoRef.current?.value || ""
        return additionalInfo.trim().length > 0
      case 2: // Schedule step
        // Skip schedule validation if scheduling is disabled
        if (selectedAssistanceType?.allowSchedule === false) {
          return true
        }

        const selectedDays = form.getValues("selectedDays")
        const timeRangePreset = form.getValues("timeRangePreset")
        const startTime = form.getValues("startTime")
        const endTime = form.getValues("endTime")

        return (
          selectedDays &&
          selectedDays.length > 0 &&
          (timeRangePreset !== "custom" || (startTime && endTime && startTime < endTime))
        )
      case 3: // Review step
        const willingToDonate = form.getValues("willingToDonate")
        return willingToDonate === "yes" || willingToDonate === "no"
      default:
        return false
    }
  }

  // Load assistance types
  useEffect(() => {
    const loadAssistanceTypes = async () => {
      setIsLoading(true)
      try {
        // Initialize default assistance types if needed
        await initializeAssistanceTypes()

        // Get assistance types
        const types = await getAssistanceTypes()
        setAssistanceTypes(types)

        // Don't set default value for assistance type
      } catch (error) {
        console.error("Error loading assistance types:", error)
        setMessage({ type: "error", text: "Failed to load assistance types" })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssistanceTypes()
  }, [form])

  // Handle photo URLs change
  const handlePhotoUrlsChange = (urls: string[]) => {
    // Ensure urls is an array
    const safeUrls = Array.isArray(urls) ? urls : []
    setPhotoUrls(safeUrls)
    form.setValue("photoUrls", safeUrls)
  }

  // Handle time range selection
  const handleTimeRangeChange = (value: "early" | "middle" | "late" | "custom") => {
    setSelectedTimeRange(value)
    form.setValue("timeRangePreset", value)

    if (value !== "custom") {
      const range = TIME_RANGES[value]
      form.setValue("startTime", range.startTime)
      form.setValue("endTime", range.endTime)
    }
  }

  // Handle next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Update form values from refs
      if (characterIdRef.current) {
        form.setValue("characterId", characterIdRef.current.value)
      }
      if (contactInfoRef.current) {
        form.setValue("contactInfo", contactInfoRef.current.value)
      }
      if (additionalInfoRef.current) {
        form.setValue("additionalInfo", additionalInfoRef.current.value)
      }

      // Check validation but proceed only if valid
      if (isStepValid()) {
        setCurrentStep(currentStep + 1)
      } else {
        // Show validation errors or messages
        // This will trigger validation UI to show errors
        form.trigger()

        // You can also set a message to inform the user
        setMessage({
          type: "error",
          text: "Please fill in all required fields correctly before proceeding",
        })

        // Clear the message after a few seconds
        setTimeout(() => {
          setMessage(null)
        }, 3000)
      }
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle step change
  const handleStepChange = (step: number) => {
    // Only allow navigation to current or previous steps
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }

  // Copy request number to clipboard
  const handleCopyRequestNumber = (e: React.MouseEvent) => {
    // Prevent any default behavior and stop propagation
    e.preventDefault()
    e.stopPropagation()

    if (requestNumber) {
      navigator.clipboard
        .writeText(requestNumber)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch((err) => {
          console.error("Failed to copy: ", err)
          // Fallback selection method if clipboard API fails
          const el = document.createElement("textarea")
          el.value = requestNumber
          document.body.appendChild(el)
          el.select()
          document.execCommand("copy")
          document.body.removeChild(el)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
    }
  }

  // Convert time string to Date object
  const formatTime = (timeString: string): string => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  // Get time range description
  const getTimeRangeDescription = () => {
    const preset = form.getValues("timeRangePreset")
    if (preset !== "custom") {
      return TIME_RANGES[preset].label
    }

    const startTime = form.getValues("startTime")
    const endTime = form.getValues("endTime")
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  // Format selected days for display
  const formatSelectedDays = (days: string[]): string => {
    if (!days || days.length === 0) return "No days selected"
    if (days.length === 7) return "Every day"

    // Sort days according to calendar order (Monday first)
    const orderedDays = [...days].sort((a, b) => {
      const dayOrder = DAYS_OF_WEEK.map((day) => day.id)
      return dayOrder.indexOf(a) - dayOrder.indexOf(b)
    })

    return orderedDays.map((day) => DAYS_OF_WEEK.find((d) => d.id === day)?.label).join(", ")
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Update form values from refs
    if (characterIdRef.current) {
      form.setValue("characterId", characterIdRef.current.value)
    }
    if (contactInfoRef.current) {
      form.setValue("contactInfo", contactInfoRef.current.value)
    }
    if (additionalInfoRef.current) {
      form.setValue("additionalInfo", additionalInfoRef.current.value)
    }

    // If scheduling is disabled, set default values for schedule fields
    if (selectedAssistanceType?.allowSchedule === false) {
      form.setValue("selectedDays", ["monday"]) // Set a default day to pass validation
      form.setValue("timeRangePreset", "early")
      form.setValue("startTime", TIME_RANGES.early.startTime)
      form.setValue("endTime", TIME_RANGES.early.endTime)
    }

    // Validate all fields before submission
    const isValid = await form.trigger()

    if (!isValid) {
      return // Don't proceed if validation fails
    }

    const values = form.getValues()

    // Check for duplicate bookings first
    try {
      // Get all bookings
      const bookings = await getBookings()

      // Filter for active bookings with the same character ID and assistance type
      const duplicateBookings = bookings.filter(
        (booking) =>
          booking.characterId === values.characterId &&
          booking.assistanceTypeId === values.assistanceTypeId &&
          booking.status !== "cancelled",
      )

      if (duplicateBookings.length > 0) {
        setMessage({
          type: "error",
          text: "You already have an active request for this assistance type. Please wait until it's completed or cancelled before requesting again.",
        })
        return
      }
    } catch (error) {
      console.error("Error checking for duplicate bookings:", error)
      // Continue even if check fails
    }

    // If no duplicate, proceed with normal flow
    if (values.willingToDonate === "no") {
      // Show donation modal
      setShowDonationModal(true)
      setPendingSubmission(true)
    } else {
      // Proceed with submission
      onSubmit()
    }
  }

  // Handle donation modal confirmation
  const handleDonationModalConfirm = () => {
    setShowDonationModal(false)
    // Proceed with submission
    onSubmit()
  }

  // Handle donation modal cancel
  const handleDonationModalCancel = () => {
    setShowDonationModal(false)
    setPendingSubmission(false)
    // Go back to the donation selection
    form.setValue("willingToDonate", "yes")
  }

  // Form submission handler
  async function onSubmit() {
    setIsSubmitting(true)
    setMessage(null)
    setPendingSubmission(false)

    try {
      // Update form values from refs
      if (characterIdRef.current) {
        form.setValue("characterId", characterIdRef.current.value)
      }
      if (contactInfoRef.current) {
        form.setValue("contactInfo", contactInfoRef.current.value)
      }
      if (additionalInfoRef.current) {
        form.setValue("additionalInfo", additionalInfoRef.current.value)
      }

      const values = form.getValues()

      // Validate required fields before submission
      if (!values.characterId || !values.contactInfo || !values.assistanceTypeId || !values.additionalInfo) {
        setMessage({ type: "error", text: "Please fill in all required fields" })
        setIsSubmitting(false)
        return
      }

      // Create form data
      const formData = new FormData()

      // Ensure all required fields are set with non-empty values
      formData.append("characterId", values.characterId.trim())
      formData.append("contactInfo", values.contactInfo.trim())
      formData.append("assistanceTypeId", values.assistanceTypeId)
      formData.append("additionalInfo", values.additionalInfo.trim())

      // Only add schedule-related fields if scheduling is enabled
      if (selectedAssistanceType?.allowSchedule !== false) {
        // Add selected days - ensure it's a valid array
        const selectedDays = Array.isArray(values.selectedDays) ? values.selectedDays : []
        formData.append("selectedDays", JSON.stringify(selectedDays))

        // Add time range
        formData.append("timeRangePreset", values.timeRangePreset || "early")
        formData.append("startTime", values.startTime || "")
        formData.append("endTime", values.endTime || "")
      } else {
        // Add empty values for schedule fields when scheduling is disabled
        formData.append("selectedDays", JSON.stringify([]))
        formData.append("timeRangePreset", "early")
        formData.append("startTime", "")
        formData.append("endTime", "")
      }

      // Add photo URLs if any - ensure it's a valid array
      const safePhotoUrls = Array.isArray(photoUrls) ? photoUrls : []
      if (safePhotoUrls.length > 0) {
        formData.append("photoUrls", JSON.stringify(safePhotoUrls))
      }

      // Add slots only if scheduling is enabled
      formData.append("slots", (selectedAssistanceType?.allowSchedule !== false ? values.slots || 1 : 1).toString())

      // Add willing to donate
      formData.append("willingToDonate", values.willingToDonate || "no")

      // Submit booking with error handling
      try {
        const result = await createBooking(formData)

        if (result.success) {
          // Set the request number and booking ID
          if (result.requestNumber) {
            setRequestNumber(result.requestNumber)
          }

          // Store the booking ID if available
          if (result.booking && result.booking._id) {
            setBookingId(result.booking._id.toString())
          }

          // Set isComplete to true - this will now completely change the UI
          setIsComplete(true)

          // Refresh the page after a short delay
          setTimeout(() => {
            router.refresh()
          }, 3000)
        } else {
          // Check if this is a duplicate booking error
          if (result.isDuplicate) {
            setMessage({
              type: "error",
              text: "You already have an active request for this assistance type. Please wait until it's completed or cancelled before requesting again.",
            })
          } else {
            setMessage({ type: "error", text: result.message })
          }
        }
      } catch (error) {
        console.error("Error submitting booking:", error)
        setMessage({ type: "error", text: "An unexpected error occurred while submitting your booking" })
      }
    } catch (error) {
      console.error("Error preparing form data:", error)
      setMessage({ type: "error", text: "An unexpected error occurred while preparing your booking" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add this function with the other handler functions
  const handleSelectAllDays = (checked: boolean) => {
    setSelectAllDays(checked)
    if (checked) {
      // Select all days
      form.setValue(
        "selectedDays",
        DAYS_OF_WEEK.map((day) => day.id),
      )
    } else {
      // Clear all days
      form.setValue("selectedDays", [])
    }
  }

  // Handle starting a new booking
  const handleNewBooking = () => {
    // Reset the form state
    form.reset({
      characterId: "",
      contactInfo: "",
      assistanceTypeId: "",
      additionalInfo: "",
      selectedDays: [],
      timeRangePreset: "early",
      startTime: TIME_RANGES.early.startTime,
      endTime: TIME_RANGES.early.endTime,
      photoUrls: [],
      slots: 1,
      willingToDonate: "no",
    })

    // Reset component state
    setCurrentStep(0)
    setIsComplete(false)
    setRequestNumber(null)
    setMessage(null)
    setPhotoUrls([])
    setSelectAllDays(false)

    // Reset refs
    if (characterIdRef.current) characterIdRef.current.value = ""
    if (contactInfoRef.current) contactInfoRef.current.value = ""
    if (additionalInfoRef.current) additionalInfoRef.current.value = ""

    // Force a hard refresh if needed
    window.location.href = "/games/ragnarok-m-classic"
  }

  // Get assistance type name by ID
  const getAssistanceTypeName = (id: string) => {
    const type = assistanceTypes.find((type) => type._id === id)
    return type?.name || "Unknown"
  }

  // Add a handler for assistance type changes
  const handleAssistanceTypeChange = (typeId: string) => {
    const selectedType = assistanceTypes.find((type) => type._id?.toString() === typeId)
    setSelectedAssistanceType(selectedType || null)
    form.setValue("assistanceTypeId", typeId)
  }

  // Handle character ID change
  const handleCharacterIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    saveToLocalStorage("characterId", value)
  }

  // Handle contact info change
  const handleContactInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    saveToLocalStorage("contactInfo", value)
  }

  // Render the completion screen
  const renderCompletionScreen = () => {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <CheckCircle className="mx-auto h-20 w-20 text-green-500" />
          <h3 className="mt-6 text-2xl font-bold">Request Submitted!</h3>
          <p className="mt-2 text-muted-foreground">Your assistance request has been submitted successfully.</p>
          <p className="mt-2 text-muted-foreground">Our team will contact you within 24 hours.</p>
        </div>

        {requestNumber && (
          <div className="mt-8 p-6 bg-primary/10 rounded-lg border-2 border-primary/30 shadow-md animate-pulse">
            <h4 className="text-center font-bold text-lg mb-3">Your Request Number</h4>
            <div className="flex items-center justify-center gap-2 mb-4">
              <code className="bg-background px-4 py-2 rounded border text-lg font-mono select-all">
                {requestNumber}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyRequestNumber}
                title="Copy to clipboard"
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-center font-medium">
              Keep this request number to check on your assistance request anytime.
            </p>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-8">
          {bookingId && (
            <Button asChild>
              <Link href={`/request/${bookingId}`}>View This Request</Link>
            </Button>
          )}
          <Button onClick={handleNewBooking}>Book Another Request</Button>
        </div>
      </div>
    )
  }

  // Get the content for the current step
  const getCurrentStepContent = () => {
    // Get the actual step in the base steps array
    const actualStep = getActualStepIndex(currentStep)

    switch (actualStep) {
      case 0: // Customer Details
        return (
          <div className="space-y-6">
            <div>
              <FormLabel htmlFor="characterId">Character ID</FormLabel>
              <div className="flex items-center">
                <Gamepad2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={characterIdRef}
                  id="characterId"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your character ID"
                  onChange={handleCharacterIdChange}
                  defaultValue={form.getValues("characterId")}
                />
              </div>
              <FormDescription>Your in-game character ID (numbers only)</FormDescription>
              {characterIdRef.current &&
                !/^\d+$/.test(characterIdRef.current.value) &&
                characterIdRef.current.value !== "" && (
                  <p className="text-sm font-medium text-destructive">Character ID must contain only numbers</p>
                )}
            </div>

            <div>
              <FormLabel htmlFor="contactInfo">Contact Information</FormLabel>
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={contactInfoRef}
                  id="contactInfo"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Email, Discord, WhatsApp, or Messenger"
                  onChange={handleContactInfoChange}
                  defaultValue={form.getValues("contactInfo")}
                />
              </div>
              <FormDescription>
                Please provide your contact details on at least one of the following platforms—WhatsApp, Discord,
                Messenger, or Email—in case we're unable to reach you through in-game messages.
              </FormDescription>
              {contactInfoRef.current && contactInfoRef.current.value === "" && (
                <p className="text-sm font-medium text-destructive">Contact information is required</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="assistanceTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What assistance do you need?</FormLabel>
                  <Select
                    disabled={isLoading || assistanceTypes.length === 0}
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleAssistanceTypeChange(value)
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Loading options...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select assistance type" />
                        )}
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
                  <FormDescription>Select the type of assistance you need</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 1: // Assistance Info
        return (
          <div className="space-y-6">
            <div>
              <FormLabel htmlFor="additionalInfo">Additional Information</FormLabel>
              <div className="flex items-start">
                <Info className="mr-2 h-4 w-4 mt-2 text-muted-foreground" />
                <textarea
                  ref={additionalInfoRef}
                  id="additionalInfo"
                  className="min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Provide details about your request..."
                  defaultValue={form.getValues("additionalInfo")}
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
                    <FormLabel>Photo Attachments</FormLabel>
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
                    <FormDescription>Upload screenshots or images related to your request (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )

      case 2: // Schedule
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="selectedDays"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>
                      Days of The Week <span className="text-destructive">*</span>
                    </FormLabel>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAllDays}
                        onChange={(e) => handleSelectAllDays(e.target.checked)}
                        className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span>Select All</span>
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
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            value={day.id}
                            checked={field.value?.includes(day.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              const currentValue = Array.isArray(field.value) ? [...field.value] : []
                              const newValue = checked
                                ? [...currentValue, day.id]
                                : currentValue.filter((val) => val !== day.id)
                              field.onChange(newValue)

                              // Update selectAllDays state based on whether all days are selected
                              if (checked && newValue.length === DAYS_OF_WEEK.length) {
                                setSelectAllDays(true)
                              } else if (!checked) {
                                setSelectAllDays(false)
                              }
                            }}
                          />
                          <span>{day.label}</span>
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
                  <FormLabel className="text-sm font-medium">Time of The Day</FormLabel>
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
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            value={key}
                            checked={field.value === key}
                            onChange={() => {
                              field.onChange(key)
                              handleTimeRangeChange(key as "early" | "middle" | "late" | "custom")
                            }}
                          />
                          <span>{range.label}</span>
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
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                      <FormLabel>End Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                  <FormLabel>How many slots do you need?</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-r-none"
                        onClick={() => {
                          const newValue = Math.max(1, field.value - 1)
                          field.onChange(newValue)
                        }}
                        disabled={field.value <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 border-y border-input bg-background px-3 py-2 text-center">
                        {field.value} {field.value === 1 ? "slot" : "slots"}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-l-none"
                        onClick={() => {
                          const newValue = Math.min(4, field.value + 1)
                          field.onChange(newValue)
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
        )

      case 3: // Review
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Character ID</h4>
                  <p>{characterIdRef.current?.value || form.getValues("characterId")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Contact Info</h4>
                  <p>{contactInfoRef.current?.value || form.getValues("contactInfo")}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Assistance Type</h4>
                <p>{getAssistanceTypeName(form.getValues("assistanceTypeId"))}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
                <p className="whitespace-pre-wrap">
                  {additionalInfoRef.current?.value || form.getValues("additionalInfo")}
                </p>
              </div>

              {selectedAssistanceType?.allowSchedule ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Selected Days</h4>
                      <p>{formatSelectedDays(form.getValues("selectedDays"))}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Time Range</h4>
                      <p>{getTimeRangeDescription()}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Number of Slots</h4>
                    <p>
                      {form.getValues("slots")} {form.getValues("slots") === 1 ? "slot" : "slots"}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Schedule</h4>
                  <p>Our team will contact you to arrange a suitable time.</p>
                </div>
              )}
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
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            value="yes"
                            checked={field.value === "yes"}
                            onChange={() => field.onChange("yes")}
                          />
                          <Heart
                            className={`mr-2 h-5 w-5 ${field.value === "yes" ? "text-red-500 fill-red-500" : ""}`}
                          />
                          <span>Yes, I'm willing to donate</span>
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center p-4 rounded-md border-2 cursor-pointer transition-all ${
                            field.value === "no"
                              ? "bg-background/90 border-gray-400 text-foreground font-medium shadow-sm"
                              : "bg-background border-input hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            value="no"
                            checked={field.value === "no"}
                            onChange={() => field.onChange("no")}
                          />
                          <span>No, I don't have intention to donate</span>
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
        )

      default:
        return null
    }
  }

  // Render the form wizard
  const renderFormWizard = () => {
    return (
      <div className="space-y-6">
        <Form {...form}>
          <FormWizard
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            isSubmitting={isSubmitting || pendingSubmission}
            isStepValid={true} // Always enable the Next button
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
          >
            {getCurrentStepContent()}
          </FormWizard>
        </Form>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          <span>{isComplete ? "Request Submitted" : "Request Assistance"}</span>
        </CardTitle>
        <CardDescription>
          {isComplete
            ? "Your assistance request has been submitted successfully"
            : "Let us know the assistance you need and choose a time that works for you"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Only show error messages, not success messages */}
        {message && message.type === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Completely separate rendering based on completion state */}
        {isComplete ? renderCompletionScreen() : renderFormWizard()}
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        {!isComplete && <p>Please fill out all required fields to proceed</p>}
      </CardFooter>

      {/* Donation Modal */}
      <Dialog open={showDonationModal} onOpenChange={(open) => !open && setShowDonationModal(false)}>
        <DialogContent className="w-full max-w-md overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <span>Support Our Service</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              We're happy to offer free help to everyone—but to keep things running smoothly, we give priority
              assistance to those who support us through donations.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <p className="text-sm break-words">
                Would you like to consider supporting us with a donation? No pressure—you don't need to donate until
                your requested assistance has been scheduled and confirmed.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={handleDonationModalCancel} className="sm:flex-1">
              <Heart className="mr-2 h-4 w-4 text-red-500" />
              Yes, I'll donate
            </Button>
            <Button onClick={handleDonationModalConfirm} className="sm:flex-1">
              Continue without donating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
