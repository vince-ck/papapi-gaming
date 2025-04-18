"use client"

import { useSession } from "next-auth/react"
import { AdminPanel } from "@/components/admin-panel"

export function AdminPanelWrapper() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  // Only render the admin console if the user is an admin
  if (!isAdmin) {
    return null
  }

  return (
    <div className="mb-8">
      <AdminPanel />
    </div>
  )
}
