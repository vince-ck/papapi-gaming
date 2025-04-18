"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signOut, useSession } from "next-auth/react"
import { getFeaturedToons, saveFeaturedToon, deleteFeaturedToon } from "@/actions/featured-toons"
import type { FeaturedToon } from "@/models/featured-toon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageUpload } from "@/components/image-upload"
import { ArrowLeft, Plus, Trash2, Loader2, Save, RefreshCw } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoginModal } from "@/components/login-modal"

export default function AdminFeaturedToonsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [featuredToons, setFeaturedToons] = useState<FeaturedToon[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentToon, setCurrentToon] = useState<FeaturedToon | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
      setIsLoginModalOpen(true)
    } else {
      setIsLoginModalOpen(false)
    }
  }, [session, status])

  // Handle modal close - redirect to home if not authenticated
  const handleModalClose = () => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
      router.push("/")
    } else {
      setIsLoginModalOpen(false)
    }
  }

  // Load featured toons
  const loadFeaturedToons = async () => {
    if (status !== "authenticated" || session?.user?.role !== "admin") return

    setIsLoadingData(true)
    try {
      const toons = await getFeaturedToons()
      setFeaturedToons(toons)

      // Set active tab to first toon or empty if none
      if (toons.length > 0 && !activeTab) {
        setActiveTab(toons[0]._id as string)
      }
    } catch (error) {
      console.error("Error loading featured toons:", error)
      setMessage({ type: "error", text: "Failed to load featured toons" })
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadFeaturedToons()
    }
  }, [status, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const formData = new FormData(event.currentTarget)

      // Add the selected file if it exists
      if (selectedFile) {
        formData.set("image", selectedFile)
      }

      const result = await saveFeaturedToon(formData)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        await loadFeaturedToons()
        setIsDialogOpen(false)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save featured toon" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" })
      console.error("Error saving featured toon:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!currentToon?._id) return

    setIsLoading(true)
    try {
      const result = await deleteFeaturedToon(currentToon._id as string)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        await loadFeaturedToons()
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete featured toon" })
      console.error("Error deleting featured toon:", error)
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  function openNewToonDialog() {
    setCurrentToon(null)
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  function openEditToonDialog(toon: FeaturedToon) {
    setCurrentToon(toon)
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  function confirmDelete(toon: FeaturedToon) {
    setCurrentToon(toon)
    setIsDeleteDialogOpen(true)
  }

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/")
  }

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // If not admin, show login modal
  if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "admin")) {
    return (
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    )
  }

  return (
    <>
      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Featured Toons</h1>
            <p className="text-muted-foreground">Manage character images displayed in the game</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/games/ragnarok-m-classic">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Game
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Featured Toons</CardTitle>
              <CardDescription>Update the character images displayed in the Featured Toons section</CardDescription>
            </div>
            <Button onClick={openNewToonDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Toon
            </Button>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert variant={message.type === "success" ? "default" : "destructive"} className="mb-4">
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {isLoadingData ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : featuredToons.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No featured toons found</p>
                <Button onClick={openNewToonDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Toon
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  {featuredToons.map((toon) => (
                    <TabsTrigger key={toon._id as string} value={toon._id as string}>
                      {toon.displayName}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {featuredToons.map((toon) => (
                  <TabsContent key={toon._id as string} value={toon._id as string}>
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="relative w-64 h-64 overflow-hidden rounded-lg border border-border/50">
                          {toon.imageUrl && (
                            <Image
                              src={toon.imageUrl || "/placeholder.svg"}
                              alt={toon.displayName}
                              width={256}
                              height={256}
                              className="object-cover"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label>Character Class</Label>
                          <p className="text-sm">{toon.characterClass}</p>
                        </div>
                        <div>
                          <Label>Display Name</Label>
                          <p className="text-sm">{toon.displayName}</p>
                        </div>
                        {toon.description && (
                          <div>
                            <Label>Description</Label>
                            <p className="text-sm">{toon.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => openEditToonDialog(toon)}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={() => confirmDelete(toon)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">Images will be updated immediately on the game page</p>
            <Button variant="outline" size="sm" onClick={loadFeaturedToons}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentToon ? "Edit Featured Toon" : "Add New Featured Toon"}</DialogTitle>
            <DialogDescription>
              {currentToon
                ? "Update the details for this featured toon"
                : "Create a new character to feature in the game"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentToon && <input type="hidden" name="id" value={currentToon._id as string} />}

            {currentToon?.imageUrl && <input type="hidden" name="currentImageUrl" value={currentToon.imageUrl} />}

            <div className="space-y-2">
              <Label htmlFor="characterClass">Character Class</Label>
              <Input
                id="characterClass"
                name="characterClass"
                defaultValue={currentToon?.characterClass || ""}
                placeholder="e.g., mechanic, royal_guard"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={currentToon?.displayName || ""}
                placeholder="e.g., Mechanic, Royal Guard"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={currentToon?.description || ""}
                placeholder="Brief description of this character class"
                rows={3}
              />
            </div>

            <ImageUpload currentImageUrl={currentToon?.imageUrl} onChange={setSelectedFile} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {currentToon?.displayName} featured toon. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        message="You need admin privileges to access this page."
      />
    </>
  )
}
