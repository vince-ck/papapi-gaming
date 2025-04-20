"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimeRangePickerProps {
  startDateTime: Date
  endDateTime: Date
  onStartChange: (date: Date) => void
  onEndChange: (date: Date) => void
  className?: string
}

export function DateTimeRangePicker({
  startDateTime,
  endDateTime,
  onStartChange,
  onEndChange,
  className,
}: DateTimeRangePickerProps) {
  // Generate time options (30 min intervals)
  const timeOptions = React.useMemo(() => {
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
  }, [])

  const handleStartTimeChange = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    const newDate = new Date(startDateTime)
    newDate.setHours(hours, minutes)
    onStartChange(newDate)
  }

  const handleEndTimeChange = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    const newDate = new Date(endDateTime)
    newDate.setHours(hours, minutes)
    onEndChange(newDate)
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Start Date & Time</label>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !startDateTime && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDateTime ? format(startDateTime, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDateTime}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date)
                    newDate.setHours(startDateTime.getHours(), startDateTime.getMinutes())
                    onStartChange(newDate)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select value={format(startDateTime, "HH:mm")} onValueChange={handleStartTimeChange}>
            <SelectTrigger className="w-[120px]">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={`start-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">End Date & Time</label>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !endDateTime && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDateTime ? format(endDateTime, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDateTime}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date)
                    newDate.setHours(endDateTime.getHours(), endDateTime.getMinutes())
                    onEndChange(newDate)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select value={format(endDateTime, "HH:mm")} onValueChange={handleEndTimeChange}>
            <SelectTrigger className="w-[120px]">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={`end-${time}`} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
