"use client"

import type * as React from "react"
import { Check, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FormWizardProps {
  steps: {
    id: string
    title: string
    description?: string
  }[]
  currentStep: number
  onStepChange: (step: number) => void
  isSubmitting?: boolean
  isStepValid?: boolean
  onNext?: () => void
  onPrevious?: () => void
  onSubmit?: () => void
  className?: string
  children?: React.ReactNode
}

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  isSubmitting = false,
  isStepValid = true,
  onNext,
  onPrevious,
  onSubmit,
  className,
  children,
}: FormWizardProps) {
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      onSubmit?.()
    } else {
      onNext?.()
    }
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Progress Steps */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-muted" />
        <ol className="relative z-10 flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <li key={step.id} className="flex flex-col items-center">
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isActive && "border-2 border-primary bg-background text-primary",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground",
                  )}
                  onClick={() => {
                    // Only allow navigation to completed steps or current step
                    if (isCompleted || isActive) {
                      onStepChange(index)
                    }
                  }}
                  disabled={!isCompleted && !isActive}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                </button>
                <span
                  className={cn(
                    "mt-2 text-center text-sm font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Current Step Title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
        {steps[currentStep].description && (
          <p className="mt-1 text-sm text-muted-foreground">{steps[currentStep].description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className="mt-6">{children}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        {/* Previous button */}
        {!isFirstStep ? (
          <Button type="button" variant="outline" onClick={onPrevious} disabled={isSubmitting}>
            Previous
          </Button>
        ) : (
          <div></div>
        )}

        {/* Next/Submit button */}
        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isLastStep ? "Submitting..." : "Processing..."}
            </>
          ) : isLastStep ? (
            "Submit Request"
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
