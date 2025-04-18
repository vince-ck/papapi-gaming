import { GameSidebar } from "@/components/game-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { SidebarInset } from "@/components/ui/sidebar"
import { FeaturedGames } from "@/components/featured-games"
import { GameCategories } from "@/components/game-categories"
import { RecentlyPlayed } from "@/components/recently-played"
import { GameAssistant } from "@/components/game-assistant"
import { AdminPanelWrapper } from "@/components/admin-panel-wrapper"

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <GameSidebar />
      <SidebarInset className="bg-gradient-to-b from-background via-background/95 to-background/90">
        <MobileNav />
        <div className="container mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
          <AdminPanelWrapper />
          <div className="space-y-8">
            <FeaturedGames />
            <GameCategories />
            <RecentlyPlayed />
            <GameAssistant />
          </div>
        </div>
      </SidebarInset>
    </div>
  )
}
