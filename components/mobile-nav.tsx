"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Clock, Gift, Search, Bell, LogIn, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PapaPiLogo } from "@/components/papa-pi-logo"
import { useSession } from "next-auth/react"
import { LoginModal } from "@/components/login-modal"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function MobileNav() {
  const pathname = usePathname()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { data: session, status } = useSession()
  const [activeItem, setActiveItem] = useState<string>("games")

  const navItems = [
    { id: "games", icon: Gamepad2, href: "/games/ragnarok-m-classic", label: "Games" },
    { id: "lucky-draw", icon: Gift, href: "#", label: "Lucky Draw" },
    { id: "recent", icon: Clock, href: "/recent", label: "Recent" },
  ]

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      {/* Top mobile navigation */}
      <div
        className={cn(
          "sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 backdrop-blur transition-all duration-300 md:hidden",
          isScrolled ? "bg-card/90 border-border/60 shadow-sm" : "bg-card/50 border-border/40",
        )}
      >
        <div className="flex items-center">
          <SidebarTrigger className="mr-2 md:hidden hover:bg-muted/80 transition-colors" />
          <Link href="/games/ragnarok-m-classic" className="flex items-center gap-2 group">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
              <PapaPiLogo size="md" />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">Papa-Pi</h1>
              <p className="text-[10px] text-muted-foreground">Gaming Assistant</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Search games..."
                  className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSearchOpen(true)}
                      className="hover:bg-muted/80 transition-colors"
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Search</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </AnimatePresence>

          <Sheet>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hover:bg-muted/80 transition-colors">
                      <Bell className="h-5 w-5" />
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
                      >
                        2
                      </motion.span>
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <div className="space-y-4 py-4">
                <h3 className="text-lg font-medium">Notifications</h3>
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-medium">Your request has been updated</p>
                      <p className="text-xs text-muted-foreground">5 minutes ago</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {status === "authenticated" ? (
            <Sheet>
              <SheetTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Avatar className="h-8 w-8 cursor-pointer ring-offset-background transition-colors hover:ring-2 hover:ring-ring hover:ring-offset-2">
                    <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || "User"} />
                    <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </motion.div>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 py-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={session?.user?.image || "/placeholder.svg"}
                        alt={session?.user?.name || "User"}
                      />
                      <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{session?.user?.name}</p>
                      <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex-1 border-t">
                    <nav className="flex flex-col gap-1 py-4">
                      {session?.user?.role === "admin" && (
                        <SheetClose asChild>
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted transition-colors"
                          >
                            Admin Dashboard
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link
                          href="/recent"
                          className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted transition-colors"
                        >
                          My Requests
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="#"
                          className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted transition-colors"
                        >
                          Settings
                        </Link>
                      </SheetClose>
                    </nav>
                  </div>
                  <div className="border-t pt-4">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={() => {}}>
                        Sign Out
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="hover:bg-muted/80 transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Bottom mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur md:hidden">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href} className="block">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex h-16 w-16 flex-col items-center justify-center rounded-none transition-colors",
                  activeItem === item.id
                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:animate-in after:fade-in after:slide-in-from-bottom-1"
                    : "text-muted-foreground",
                )}
                onClick={() => setActiveItem(item.id)}
              >
                <item.icon
                  className={cn("h-5 w-5 transition-transform duration-200", activeItem === item.id && "scale-110")}
                />
                <span
                  className={cn("mt-1 text-xs transition-all duration-200", activeItem === item.id && "font-medium")}
                >
                  {item.id.charAt(0).toUpperCase() + item.id.slice(1)}
                </span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
