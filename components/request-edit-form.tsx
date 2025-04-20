"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Gamepad2, Mail, Info, ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAllAssistanceTypes, updateBooking } from "@/actions/request-details"
import type { Booking, AssistanceType } from "@/models/assistance"
import { Textarea } from "@/components/ui/textarea"

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
  slots: z.number().min(1).max(4),
  willingToDonate: z.enum(["yes", "no"]),
})

type FormValues = z.infer<typeof formSchema>

interface RequestEditFormProps {
  booking: Booking
  onCancel: () => void
  onSuccess: (updatedBooking: Booking) => void
}

export function RequestEditForm({ booking, onCancel, onSuccess }: RequestEditFormProps) {
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<"early" | "middle" | "late" | "custom">(
    booking.timeRangePreset || "early",
  )
  const [timeOptions] = useState(generateTimeOptions())
  const [selectAllDays, setSelectAllDays] = useState(booking.selectedDays?.length === 7)

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
      } catch (error) {
        console.error("Error loading assistance types:", error)
        setMessage({ type: "error", text: "Failed to load assistance types" })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssistanceTypes()
  }, [])

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

  // Handle select all days
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

  // Format time string to AM/PM format
  const formatTime = (timeString: string): string => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    if (!booking._id) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await updateBooking(booking._id.toString(), {
        characterId: values.characterId,
        contactInfo: values.contactInfo,
        assistanceTypeId: values.assistanceTypeId,
        additionalInfo: values.additionalInfo,
        selectedDays: values.selectedDays,
        timeRangePreset: values.timeRangePreset,
        startTime: values.startTime,
        endTime: values.endTime,
        slots: values.slots,
        willingToDonate: values.willingToDonate,
      })

      if (result.success && result.booking) {
        setMessage({ type: "success", text: result.message })
        onSuccess(result.booking)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error updating booking:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Request</CardTitle>
        <CardDescription>Update your assistance request details</CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="characterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character ID</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Gamepad2 className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter your character ID" {...field} />
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
                          <Input placeholder="Email, Discord, WhatsApp, or Messenger" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>Your contact details where we can reach you</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assistanceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What assistance do you need?</FormLabel>
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

              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information</FormLabel>
                    <FormControl>
                      <div className="flex items-start">
                        <Info className="mr-2 h-4 w-4 mt-2 text-muted-foreground" />
                        <Textarea
                          placeholder="Provide details about your request..."
                          className="resize-none min-h-[120px]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Include specific requirements or questions about your request</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>Time of The Day</FormLabel>
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
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value))}
                      defaultValue={field.value.toString()}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select number of slots" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 slot</SelectItem>
                        <SelectItem value="2">2 slots</SelectItem>
                        <SelectItem value="3">3 slots</SelectItem>
                        <SelectItem value="4">4 slots</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Select how many slots you need</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="willingToDonate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Willing to Donate</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes, I'm willing to donate</SelectItem>
                        <SelectItem value="no">No, I don't have intention to donate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Donors receive priority scheduling and enhanced support</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
