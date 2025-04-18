"use client"

import { useState } from "react"
import Link from "next/link"
import { Home, Gamepad2, Clock, Gift, Search, Bell, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PapaPiLogo } from "@/components/papa-pi-logo"
import { useSession } from "next-auth/react"
import { LoginModal } from "@/components/login-modal"

export function MobileNav() {
  const [activeItem, setActiveItem] = useState("home")
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { data: session, status } = useSession()

  const navItems = [
    { id: "home", icon: Home },
    { id: "games", icon: Gamepad2 },
    { id: "lucky-draw", icon: Gift },
    { id: "recent", icon: Clock },
  ]

  return (
    <>
      {/* Top mobile navigation */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/40 bg-card px-4 backdrop-blur md:hidden">
        <div className="flex items-center">
          <SidebarTrigger className="mr-2 md:hidden" />
          <Link href="/" className="flex items-center gap-2">
            <PapaPiLogo size="md" />
            <div className="flex flex-col">
              <h1 className="font-bold text-sm leading-tight">Papa-Pi</h1>
              <p className="text-[10px] text-muted-foreground">Gaming Assistant</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          {status === "authenticated" ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || "User"} />
              <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsLoginModalOpen(true)}>
              <LogIn className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur md:hidden">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              className={cn(
                "flex h-16 w-16 flex-col items-center justify-center rounded-none",
                activeItem === item.id && "text-primary",
              )}
              onClick={() => setActiveItem(item.id)}
            >
              <item.icon className="h-5 w-5" />
              <span className="mt-1 text-xs">{item.id.charAt(0).toUpperCase() + item.id.slice(1)}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
