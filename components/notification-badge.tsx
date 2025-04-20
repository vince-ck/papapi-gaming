import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  count: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function NotificationBadge({ count, size = "md", className }: NotificationBadgeProps) {
  if (count <= 0) return null

  const sizeClasses = {
    sm: "h-4 w-4 text-[10px]",
    md: "h-5 w-5 text-xs",
    lg: "h-6 w-6 text-sm",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-red-500 text-white font-medium animate-in fade-in zoom-in duration-300",
        sizeClasses[size],
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </div>
  )
}
