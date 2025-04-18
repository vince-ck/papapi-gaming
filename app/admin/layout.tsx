import type React from "react"
import { GameSidebar } from "@/components/game-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { SidebarInset } from "@/components/ui/sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <GameSidebar />
      <SidebarInset className="bg-gradient-to-b from-background via-background/95 to-background/90">
        <MobileNav />
        <div className="container mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">{children}</div>
      </SidebarInset>
    </div>
  )
}
