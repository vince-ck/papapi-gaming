import type React from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full px-4 py-6 md:px-6 lg:px-8">{children}</div>
}
