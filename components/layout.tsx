"use client"

import type React from "react"
import { GameSidebar } from "@/components/game-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { SidebarProvider } from "@/components/ui/sidebar"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <GameSidebar />
        <div className="flex flex-col flex-1">
          <MobileNav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
