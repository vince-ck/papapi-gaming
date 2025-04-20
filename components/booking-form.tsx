"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { addHours } from "date-fns"
import { Loader2, CalendarRange, Gamepad2, Mail, Info, ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateTimeRangePicker } from "@/components/date-time-range-picker"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getAssistanceTypes, createBooking, initializeAssistanceTypes } from "@/actions/assistance"
import { MultiFileUpload } from "@/components/multi-file-upload"
import type { AssistanceType } from "@/models/assistance"

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
  startDateTime: z.date({
    required_error: "Please select a start date and time",
  }),
  endDateTime: z.date({
    required_error: "Please select an end date and time",
  }),
  photos: z.array(z.instanceof(File)).optional(),
})

export function BookingForm() {
  const router = useRouter()
  const [assistanceTypes, setAssistanceTypes] = useState<AssistanceType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])

  // Set default dates (now and 2 hours from now)
  const now = new Date()
  const twoHoursLater = addHours(now, 2)

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      characterId: "",
      contactInfo: "",
      assistanceTypeId: "",
      additionalInfo: "",
      startDateTime: now,
      endDateTime: twoHoursLater,
      photos: [],
    },
  })

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

  // Handle photo files change
  const handlePhotosChange = (files: File[]) => {
    setPhotoFiles(files)
    form.setValue("photos", files)
  }

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append("characterId", values.characterId)
      formData.append("contactInfo", values.contactInfo)
      formData.append("assistanceTypeId", values.assistanceTypeId)
      formData.append("additionalInfo", values.additionalInfo)
      formData.append("startDateTime", values.startDateTime.toISOString())
      formData.append("endDateTime", values.endDateTime.toISOString())

      // Add photos if any
      if (photoFiles.length > 0) {
        photoFiles.forEach((file, index) => {
          formData.append(`photo${index + 1}`, file)
        })
      }

      // Submit booking
      const result = await createBooking(formData)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        // Reset form
        form.reset({
          characterId: "",
          contactInfo: "",
          assistanceTypeId: assistanceTypes.length > 0 ? (assistanceTypes[0]._id as string) : "",
          additionalInfo: "",
          startDateTime: new Date(),
          endDateTime: addHours(new Date(), 2),
          photos: [],
        })
        setPhotoFiles([])

        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error submitting booking:", error)
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          <span>Request Assistance</span>
        </CardTitle>
        <CardDescription>
          Book a session with our expert gamers to help you with your Ragnarok M Classic journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <FormDescription>
                    Aside from in game message, write your contact details where we can reach you (Whatsapp, Discord,
                    Messenger, Email)
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                name="photos"
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
                            onChange={handlePhotosChange}
                            value={photoFiles}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>Upload screenshots or images related to your request (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startDateTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-2">When do you need assistance?</FormLabel>
                  <FormDescription className="mt-0 mb-2">All times are in UTC+7 timezone</FormDescription>
                  <DateTimeRangePicker
                    startDateTime={field.value}
                    endDateTime={form.getValues("endDateTime")}
                    onStartChange={(date) => {
                      field.onChange(date)

                      // If end date is before start date, update it
                      const endDate = form.getValues("endDateTime")
                      if (endDate <= date) {
                        form.setValue("endDateTime", addHours(date, 2))
                      }
                    }}
                    onEndChange={(date) => form.setValue("endDateTime", date)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request Assistance"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <p>Our team will confirm your booking within 24 hours</p>
      </CardFooter>
    </Card>
  )
}
