"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Star, Users, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getFeaturedToons } from "@/actions/featured-toons"
import { BookingWizard } from "@/components/booking-wizard"
import type { FeaturedToon } from "@/models/featured-toon"

const SHOW_FEATURED_TOONS = false // Set to false to hide featured toons section

export default function RagnarokMClassicPage() {
  // Initialize with empty array to avoid undefined
  const [featuredToons, setFeaturedToons] = useState<FeaturedToon[]>([])
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch the featured toons
  useEffect(() => {
    async function loadFeaturedToons() {
      try {
        const toons = await getFeaturedToons()
        // Ensure we always set an array, even if the response is invalid
        const toonsArray = Array.isArray(toons) ? toons : []
        setFeaturedToons(toonsArray)

        // Set the first toon as active if we have any
        if (toonsArray.length > 0 && toonsArray[0]?._id) {
          setActiveTab(toonsArray[0]._id as string)
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error loading featured toons:", err)
        setError("Failed to load character data")
        setIsLoading(false)
        // Ensure featuredToons is always an array even on error
        setFeaturedToons([])
      }
    }

    loadFeaturedToons()
  }, [])

  const handleZoom = (imageUrl: string) => {
    setZoomedImage(imageUrl)
  }

  const closeZoom = () => {
    setZoomedImage(null)
  }

  // Find the active toon with proper null checks
  const activeToon = React.useMemo(() => {
    if (!activeTab) return undefined
    return featuredToons.find((toon) => toon && toon._id === activeTab)
  }, [featuredToons, activeTab])

  // Safe rendering function for tab buttons
  const renderTabButtons = () => {
    // Ensure featuredToons is an array before mapping
    if (!Array.isArray(featuredToons) || featuredToons.length === 0) {
      return null
    }

    return featuredToons.map((toon) => {
      if (!toon) return null

      return (
        <button
          key={toon._id?.toString() || `toon-${Math.random()}`}
          className={cn(
            "relative flex-1 rounded-md py-2 px-3 text-sm font-medium transition-all duration-200 ease-in-out",
            activeTab === toon._id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
          onClick={() => toon._id && setActiveTab(toon._id as string)}
        >
          {toon.displayName || "Character"}
          {activeTab === toon._id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary mx-3" />}
        </button>
      )
    })
  }

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8">
      {/* Page Structure with Header, Main Content, and Footer */}
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Header Section */}
        <header className="border-b border-border/40 bg-card/30">
          <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/50">
                  <Image
                    src="/romc-logo.png"
                    alt="Ragnarok M Classic"
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Ragnarok M Classic</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Star className="mr-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
                      4.8
                    </span>
                    <span className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      1M+ Players
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      MMORPG
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            {/* Book Assistance Form - Removed duplicate header */}
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <BookingWizard />
              </div>
            </div>
          </div>
        </main>

        {/* Footer with Character Tabs - Hidden for now but functionality preserved */}
        {SHOW_FEATURED_TOONS && (
          <footer className="mt-auto border-t border-border/40 bg-muted/20 py-8">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-medium mb-6 text-center">Featured Character Classes</h2>
                {/* Tab Implementation */}
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : featuredToons.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No featured characters available</p>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-border/40 bg-card/30 p-4 shadow-sm">
                    {/* Tab Buttons */}
                    <div className="relative mb-6">
                      <div className="flex rounded-md bg-muted/50 p-1">{renderTabButtons()}</div>
                    </div>

                    {/* Tab Content */}
                    <div className="relative h-64 rounded-lg bg-gradient-to-b from-transparent to-muted/10">
                      {activeToon && (
                        <div className="absolute inset-0 flex justify-center items-center">
                          <button
                            className="group relative w-64 h-64 mx-auto overflow-hidden rounded-lg border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-md transition-all duration-200 hover:shadow-lg"
                            onClick={() => activeToon.imageUrl && handleZoom(activeToon.imageUrl)}
                            disabled={!activeToon.imageUrl}
                          >
                            <div className="absolute inset-0 scale-110 transition-transform duration-300 group-hover:scale-[1.15]">
                              <Image
                                src={activeToon.imageUrl || "/placeholder.svg"}
                                alt={activeToon.displayName || "Character"}
                                fill
                                className="object-cover object-[50%_47%] transition-opacity duration-300 group-hover:opacity-95"
                                priority
                              />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                              <p className="text-sm font-medium text-white">Click to enlarge</p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>© 2023 Papa-Pi Gaming. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}

        {/* Always show copyright footer if featured toons are hidden */}
        {!SHOW_FEATURED_TOONS && (
          <footer className="mt-auto border-t border-border/40 bg-muted/20 py-4">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="text-center text-sm text-muted-foreground">
                <p>© 2023 Papa-Pi Gaming. All rights reserved.</p>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeZoom}
        >
          <div className="relative w-[90vw] max-w-4xl aspect-square overflow-hidden rounded-lg shadow-2xl">
            <div className="absolute inset-0 scale-[1.02]">
              <Image
                src={zoomedImage || "/placeholder.svg"}
                alt="Zoomed Character"
                fill
                className="object-cover object-[50%_47%]"
                priority
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm z-10"
              onClick={(e) => {
                e.stopPropagation()
                closeZoom()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
