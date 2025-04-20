"use client"

import { AvatarFallback } from "@/components/ui/avatar"
import { AvatarImage } from "@/components/ui/avatar"
import { Avatar } from "@/components/ui/avatar"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Gamepad2, Clock, Heart, HelpCircle, Gift, ChevronDown, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PapaPiLogo } from "@/components/papa-pi-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { signOut, useSession } from "next-auth/react"
import { LoginModal } from "@/components/login-modal"

export function GameSidebar() {
  const [activeItem, setActiveItem] = useState("games")
  const [activeSubItem, setActiveSubItem] = useState("ragnarok-m-classic")
  const [gamesOpen, setGamesOpen] = useState(true) // Set to true to show the games by default
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // Set active items based on current path
  useEffect(() => {
    if (pathname.includes("/games/ragnarok-m-classic")) {
      setActiveItem("games")
      setActiveSubItem("ragnarok-m-classic")
      setGamesOpen(true)
    } else if (pathname.includes("/admin")) {
      setActiveItem("admin")
    } else if (pathname.includes("/lucky-draw")) {
      setActiveItem("lucky-draw")
    } else if (pathname.includes("/recent")) {
      setActiveItem("recent")
    } else if (pathname.includes("/favorites")) {
      setActiveItem("favorites")
    } else if (pathname.includes("/help")) {
      setActiveItem("help")
    }
  }, [pathname])

  const games = [
    {
      id: "ragnarok-m-classic",
      label: "Ragnarok M Classic",
      icon: "/romc-logo.png",
    },
  ]

  const otherMenuItems = [
    { id: "lucky-draw", icon: Gift, label: "Lucky Draw" },
    { id: "recent", icon: Clock, label: "Recent", href: "/recent" },
    { id: "favorites", icon: Heart, label: "Favorites" },
  ]

  const bottomItems = [{ id: "help", icon: HelpCircle, label: "Help" }]

  // Add admin item if user has admin role
  const adminItems = session?.user?.role === "admin" ? [{ id: "admin", icon: Settings, label: "Admin Console" }] : []

  const handleSignIn = () => {
    setIsLoginModalOpen(true)
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.refresh()
  }

  return (
    <Sidebar variant="floating" className="border-r border-border/40 bg-card/50">
      <SidebarHeader className="flex flex-col items-center justify-center py-6 border-b border-border/40">
        <Link href="/games/ragnarok-m-classic" className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <PapaPiLogo size="lg" />
            <div className="flex flex-col">
              <h1 className="font-bold text-xl leading-tight">Papa-Pi</h1>
              <p className="text-sm text-muted-foreground">Gaming Assistant</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {/* Games item with submenu - now the first item */}
          <Collapsible open={gamesOpen} onOpenChange={setGamesOpen} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  asChild
                  isActive={activeItem === "games" || gamesOpen}
                  onClick={() => setActiveItem("games")}
                  tooltip="Games"
                >
                  <Button variant="ghost" className="w-full justify-start">
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    <span>Games</span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </Button>
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent>
              <SidebarMenuSub>
                {games.map((game) => (
                  <SidebarMenuSubItem key={game.id}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={activeSubItem === game.id}
                      onClick={() => setActiveSubItem(game.id)}
                    >
                      <Link href={`/games/${game.id}`} className="flex items-center">
                        {game.icon ? (
                          <div className="mr-2 h-5 w-5 relative flex-shrink-0">
                            <Image
                              src={game.icon || "/placeholder.svg"}
                              alt={game.label}
                              width={20}
                              height={20}
                              className="rounded-sm object-cover"
                            />
                          </div>
                        ) : null}
                        {game.label}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>

          {/* Other menu items */}
          {otherMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={activeItem === item.id}
                onClick={() => setActiveItem(item.id)}
                tooltip={item.label}
              >
                <Button variant="ghost" className="w-full justify-start" asChild={!!item.href}>
                  {item.href ? (
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <>
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.label}</span>
                    </>
                  )}
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 pt-2">
        <SidebarMenu>
          {/* Help menu item */}
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={activeItem === item.id}
                onClick={() => setActiveItem(item.id)}
                tooltip={item.label}
              >
                <Button variant="ghost" className="w-full justify-start">
                  <item.icon className="mr-2 h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Admin menu item - only visible to admins */}
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={activeItem === item.id}
                onClick={() => setActiveItem(item.id)}
                tooltip={item.label}
              >
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/admin">
                    <item.icon className="mr-2 h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Sign In / Sign Out button */}
          <SidebarMenuItem>
            {session ? (
              <SidebarMenuButton asChild tooltip="Sign Out">
                <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Sign Out</span>
                </Button>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton asChild tooltip="Sign In">
                <Button variant="ghost" className="w-full justify-start" onClick={handleSignIn}>
                  <LogOut className="mr-2 h-5 w-5" transform="rotate(180)" />
                  <span>Sign In</span>
                </Button>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User profile section - only show when logged in */}
        {session && (
          <div className="p-4">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
              <Avatar>
                <AvatarImage src={session.user?.image || "/placeholder.svg"} alt={session.user?.name || "User"} />
                <AvatarFallback>{session.user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{session.user?.name || "User"}</span>
                <span className="text-xs text-muted-foreground">
                  {session.user?.role === "admin" ? "Administrator" : "Level 42"}
                </span>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </Sidebar>
  )
}
