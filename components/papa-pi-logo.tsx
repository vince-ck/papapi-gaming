import Image from "next/image"
import { cn } from "@/lib/utils"

interface PapaPiLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
}

export function PapaPiLogo({ className, size = "md", showText = false }: PapaPiLogoProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <Image src="/papa-pi-logo.png" alt="Papa-Pi Gaming Assistant" fill className="object-contain" priority />
      </div>
      {showText && <span className="sr-only">Papa-Pi Gaming Assistant</span>}
    </div>
  )
}
