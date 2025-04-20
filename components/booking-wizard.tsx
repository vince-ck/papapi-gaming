"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  AlertTriangle,
  CalendarRange,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAssistanceTypes, createBooking, initializeAssistanceTypes } from "@/actions/assistance"
import { FormWizard } from "@/components/form-wizard"
import type { AssistanceType } from "@/models/assistance"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Add a version constant at the top of the file, after the imports
const FORM_CACHE_VERSION = "1.0.0" // Increment this when form structure changes

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
    label: "Middle (10:00 - 14:00)",
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

  // Load cached values from localStorage
  useEffect(() => {
    const cachedVersion = localStorage.getItem("papapi-cache-version")

    // If version mismatch or no version found, clear cache and return
    if (cachedVersion !== FORM_CACHE_VERSION) {
      console.log("Cache version mismatch, clearing cached form data")
      localStorage.removeItem("papapi-characterId")
      localStorage.removeItem("papapi-contactInfo")
      // Add any other cached fields here
      localStorage.setItem("papapi-cache-version", FORM_CACHE_VERSION)
      return
    }

    // Load cached values if version is compatible
    const cachedCharacterId = localStorage.getItem("papapi-characterId") || ""
    const cachedContactInfo = localStorage.getItem("papapi-contactInfo") || ""

    if (cachedCharacterId) {
      form.setValue("characterId", cachedCharacterId)
    }

    if (cachedContactInfo) {
      form.setValue("contactInfo", cachedContactInfo)
    }
  }, [])

  // Save values to localStorage when they change
  // Update the saveToLocalStorage function to include version information
  const saveToLocalStorage = (field: string, value: string) => {
    localStorage.setItem(`papapi-${field}`, value)
    localStorage.setItem(`papapi-cache-version`, FORM_CACHE_VERSION)
  }

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      characterId: "",
      contactInfo: "",
      assistanceTypeId: "",
      additionalInfo: "",
      selectedDays: ["monday", "wednesday", "friday"], // Default selected days
      timeRangePreset: "early",
      startTime: TIME_RANGES.early.startTime,
      endTime: TIME_RANGES.early.endTime,
      photoUrls: [],
      slots: 1,
      willingToDonate: "no", // Set a default value
    },
  })

  // Define wizard steps - only used for the form wizard, not for completion
  const steps = [
    {
      id: "character",
      title: "Basic Details",
      description: "Enter your character and contact information",
    },
    {
      id: "assistance",
      title: "Additional Info",
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

  // Check if current step is valid
  const isStepValid = () => {
    const values = form.getValues()
    const errors = form.formState.errors

    // Check if there are any errors in the current step's fields
    switch (currentStep) {
      case 0: // Character step and assistance type
        return (
          !errors.characterId &&
          !errors.contactInfo &&
          !errors.assistanceTypeId &&
          /^\d+$/.test(values.characterId || "") &&
          values.contactInfo?.trim()?.length > 0 &&
          values.assistanceTypeId?.trim()?.length > 0
        )
      case 1: // Additional info step
        return !errors.additionalInfo && values.additionalInfo?.trim()?.length > 0
      case 2: // Schedule step
        return (
          !errors.selectedDays &&
          !errors.timeRangePreset &&
          !errors.startTime &&
          !errors.endTime &&
          !errors.slots &&
          values.selectedDays &&
          values.selectedDays.length > 0 &&
          (values.timeRangePreset !== "custom" ||
            (values.startTime && values.endTime && values.startTime < values.endTime))
        )
      case 3: // Review step
        return !errors.willingToDonate && (values.willingToDonate === "yes" || values.willingToDonate === "no")
      default:
        return false
    }
  }

  // Add a debounced validation effect that only runs when needed
  useEffect(() => {
    // Only validate fields relevant to the current step
    const fieldsToValidate = (() => {
      switch (currentStep) {
        case 0:
          return ["characterId", "contactInfo", "assistanceTypeId"]
        case 1:
          return ["additionalInfo"]
        case 2:
          return ["selectedDays", "timeRangePreset", "startTime", "endTime", "slots"]
        case 3:
          return ["willingToDonate"]
        default:
          return []
      }
    })()

    // Use a timeout to debounce validation
    const timeoutId = setTimeout(() => {
      if (fieldsToValidate.length > 0) {
        // Only trigger validation if the form is dirty or has been submitted
        if (form.formState.isDirty) {
          form.trigger(fieldsToValidate as any)
        }
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [
    form.watch([
      "characterId",
      "contactInfo",
      "assistanceTypeId",
      "additionalInfo",
      "selectedDays",
      "timeRangePreset",
      "startTime",
      "endTime",
      "slots",
      "willingToDonate",
    ]),
    currentStep,
    form,
    form.formState.isDirty,
  ])

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

        // Set default value if available
        if (types.length > 0 && !form.getValues("assistanceTypeId")) {
          form.setValue("assistanceTypeId", types[0]._id as string)
        }
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
      // If we're on the review step (step 3), submit the form
      if (currentStep === 3) {
        handleSubmit()
      } else {
        setCurrentStep(currentStep + 1)
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

  // Handle form submission check
  const handleSubmit = () => {
    // Check if user is not willing to donate
    if (form.getValues("willingToDonate") === "no") {
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

      // Add selected days - ensure it's a valid array
      const selectedDays = Array.isArray(values.selectedDays) ? values.selectedDays : []
      formData.append("selectedDays", JSON.stringify(selectedDays))

      // Add time range
      formData.append("timeRangePreset", values.timeRangePreset || "early")
      formData.append("startTime", values.startTime || "")
      formData.append("endTime", values.endTime || "")

      // Add photo URLs if any - ensure it's a valid array
      const safePhotoUrls = Array.isArray(photoUrls) ? photoUrls : []
      if (safePhotoUrls.length > 0) {
        formData.append("photoUrls", JSON.stringify(safePhotoUrls))
      }

      // Remove the code that adds startDate and endDate to the formData

      // For backward compatibility with the existing API
      // Create dummy startDate and endDate - ensure these are always set
      // const today = new Date()
      // formData.append("startDate", today.toISOString())
      // formData.append("endDate", new Date(today.getTime() + 3600000).toISOString())

      // Remove the old startDateTime and endDateTime lines
      // formData.append("startDateTime", today.toISOString())
      // formData.append("endDateTime", new Date(today.getTime() + 3600000).toISOString())

      // Add slots
      formData.append("slots", (values.slots || 1).toString())

      // Add willing to donate
      formData.append("willingToDonate", values.willingToDonate || "no")

      // Submit booking with error handling
      try {
        const result = await createBooking(formData)

        if (result.success) {
          setMessage({ type: "success", text: result.message })

          // Set the request number
          if (result.requestNumber) {
            setRequestNumber(result.requestNumber)
          }

          // Set isComplete to true - this will now completely change the UI
          setIsComplete(true)

          // Refresh the page after a short delay
          setTimeout(() => {
            router.refresh()
          }, 3000)
        } else {
          setMessage({ type: "error", text: result.message })
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

  // Handle starting a new booking
  const handleNewBooking = () => {
    // Reset the form state
    form.reset({
      characterId: "",
      contactInfo: "",
      assistanceTypeId: assistanceTypes.length > 0 ? (assistanceTypes[0]._id as string) : "",
      additionalInfo: "",
      selectedDays: ["monday", "wednesday", "friday"],
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

    // Force a hard refresh if needed
    // Using location.href causes a full page reload which is more reliable
    // than router.push for resetting everything
    window.location.href = "/games/ragnarok-m-classic"
  }

  // Get assistance type name by ID
  const getAssistanceTypeName = (id: string) => {
    const type = assistanceTypes.find((type) => type._id === id)
    return type?.name || "Unknown"
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
          <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="text-center font-medium mb-3">Your Request Number</h4>
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
            <p className="text-sm text-center text-muted-foreground">
              Please save this request number for tracking your booking status
            </p>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <Button onClick={handleNewBooking} className="px-8">
            Book Another Request
          </Button>
        </div>
      </div>
    )
  }

  // Render the form wizard
  const renderFormWizard = () => {
    return (
      <Form {...form}>
        <form className="space-y-6">
          <FormWizard
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            isSubmitting={isSubmitting || pendingSubmission}
            isStepValid={isStepValid()}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
          >
            {/* Step 1: Character Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="characterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character ID</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Gamepad2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter your character ID"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              saveToLocalStorage("characterId", e.target.value)
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Your in-game character ID (numbers only)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Information</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Email, Discord, WhatsApp, or Messenger"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              saveToLocalStorage("contactInfo", e.target.value)
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Please provide your contact details on at least one of the following platforms—WhatsApp,
                        Discord, Messenger, or Email—in case we're unable to reach you through in-game messages.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assistanceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How can we assist you?</FormLabel>
                      <Select
                        disabled={isLoading || assistanceTypes.length === 0}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
            )}

            {/* Step 2: Additional Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Provide details about your request..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Include specific requirements or questions about your request</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="selectedDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Select Days <span className="text-destructive">*</span>
                      </FormLabel>
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
                      <FormLabel>Time Range</FormLabel>
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
                      <FormLabel>Number of Slots</FormLabel>
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
                      <FormDescription>How many slots do you need?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Character ID</h4>
                      <p>{form.getValues("characterId")}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Contact Info</h4>
                      <p>{form.getValues("contactInfo")}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Assistance Type</h4>
                    <p>{getAssistanceTypeName(form.getValues("assistanceTypeId"))}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
                    <p className="whitespace-pre-wrap">{form.getValues("additionalInfo")}</p>
                  </div>

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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Number of Slots</h4>
                      <p>
                        {form.getValues("slots")} {form.getValues("slots") === 1 ? "slot" : "slots"}
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="willingToDonate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Would you like to donate to support our service?</FormLabel>
                      <FormControl>
                        <div className="flex gap-4">
                          <label
                            className={`flex-1 flex items-center justify-center p-3 rounded-md border cursor-pointer transition-colors ${
                              field.value === "yes"
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-background border-input hover:bg-muted/50"
                            }`}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              value="yes"
                              checked={field.value === "yes"}
                              onChange={() => field.onChange("yes")}
                            />
                            <span>Yes, I'd like to donate</span>
                          </label>
                          <label
                            className={`flex-1 flex items-center justify-center p-3 rounded-md border cursor-pointer transition-colors ${
                              field.value === "no"
                                ? "bg-primary/10 border-primary text-primary"
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
                            <span>No, not at this time</span>
                          </label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your donation helps us maintain and improve our assistance services
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </FormWizard>
        </form>
      </Form>
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
        {message && (
          <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Hey Adventurer!</span>
            </DialogTitle>
            <DialogDescription className="pt-4">
              We're happy to offer free help to everyone—but to keep things running smoothly, we give priority
              assistance to those who support us through donations.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
            <p>
              Would you like to consider supporting us with a donation? No pressure—you don't need to donate until your
              requested assistance has been scheduled and confirmed.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleDonationModalCancel} className="sm:flex-1">
              Yes, I'll donate
            </Button>
            <Button onClick={handleDonationModalConfirm} className="sm:flex-1">
              Continue without donating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
