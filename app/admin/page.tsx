"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminPanel } from "@/components/admin-panel"
import { Loader2 } from "lucide-react"
import { LoginModal } from "@/components/login-modal"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  useEffect(() => {
    // If not authenticated or not admin, show login modal
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

  // If not admin, show nothing (will be redirected by the modal close handler)
  if (status === "authenticated" && session?.user?.role !== "admin") {
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
      <AdminPanel />
      <LoginModal isOpen={isLoginModalOpen} onClose={handleModalClose} />
    </>
  )
}
