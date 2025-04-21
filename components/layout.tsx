"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { GameSidebar } from "@/components/game-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { ScrollToTop } from "@/components/scroll-to-top"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isScrolled, setIsScrolled] = useState(false)

  // Track scroll position for styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <GameSidebar />
        <div className="flex flex-col flex-1">
          <MobileNav />
          <main
            className={cn("flex-1 overflow-auto transition-all duration-200", isMobile && isScrolled ? "pt-2" : "pt-4")}
          >
            {children}
          </main>

          {/* Add padding at the bottom for mobile to account for the bottom nav */}
          <div className="h-16 md:hidden" />
        </div>
      </div>
      <ScrollToTop />
      <Toaster />
    </SidebarProvider>
  )
}
