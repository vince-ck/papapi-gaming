"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Loader2, FileText, ArrowRight } from "lucide-react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAssistanceTemplates } from "@/actions/assistance-templates"
import { getAssistanceTemplateById } from "@/actions/assistance-templates"
import type { AssistanceTemplate } from "@/models/assistance-template"

interface AssistanceTemplatesProps {
  onSelectTemplate: (template: AssistanceTemplate) => void
}

export function AssistanceTemplates({ onSelectTemplate }: AssistanceTemplatesProps) {
  const [templates, setTemplates] = useState<AssistanceTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true)
      try {
        // Only get active templates
        const data = await getAssistanceTemplates(true)
        setTemplates(data)
      } catch (err) {
        console.error("Error loading templates:", err)
        setError("Failed to load assistance templates")
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [])

  const handleSelectTemplate = async (templateId: string) => {
    try {
      const template = await getAssistanceTemplateById(templateId)
      if (template) {
        onSelectTemplate(template)
      } else {
        console.error("Template not found with id:", templateId)
        setError("Template not found")
      }
    } catch (err) {
      console.error("Error loading template:", err)
      setError("Failed to load template")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
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

  if (templates.length === 0) {
    return null // Don't show anything if there are no templates
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Start Templates</h2>
      <p className="text-sm text-muted-foreground">Choose a template to quickly start your assistance request</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template._id as string}
            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50"
            onClick={() => handleSelectTemplate(template._id as string)}
          >
            {template.imageUrl && (
              <div className="relative w-full h-40">
                <Image
                  src={template.imageUrl || "/placeholder.svg"}
                  alt={template.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <CardHeader className={template.imageUrl ? "pt-3 pb-2" : ""}>
              <CardTitle className="text-lg">{template.title}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0 pb-3">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Use Template
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
