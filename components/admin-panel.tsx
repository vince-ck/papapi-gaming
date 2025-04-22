"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Users, GamepadIcon as GameController, FileText, BarChart3, List, CalendarClock } from "lucide-react"

export function AdminPanel() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("overview")

  const adminModules = [
    {
      id: "featured-toons",
      name: "Featured Toons",
      description: "Manage character images displayed in the Featured Toons section",
      icon: GameController,
      link: "/admin/featured-toons",
    },
    {
      id: "assistance-requests",
      name: "Assistance Requests",
      description: "Manage all user assistance requests",
      icon: CalendarClock,
      link: "/admin/assistance-requests",
    },
    {
      id: "assistance-types",
      name: "Assistance Types",
      description: "Manage and reorder assistance types",
      icon: List,
      link: "/admin/assistance-types",
    },
    {
      id: "assistance-templates",
      name: "Assistance Templates",
      description: "Create and manage pre-defined assistance templates",
      icon: FileText,
      link: "/admin/assistance-templates",
    },
    {
      id: "users",
      name: "User Management",
      description: "Manage user accounts and permissions",
      icon: Users,
      link: "#",
      disabled: true,
    },
    {
      id: "content",
      name: "Content Management",
      description: "Manage game guides and other content",
      icon: FileText,
      link: "#",
      disabled: true,
    },
    {
      id: "analytics",
      name: "Analytics",
      description: "View site analytics and user engagement",
      icon: BarChart3,
      link: "#",
      disabled: true,
    },
    {
      id: "settings",
      name: "Site Settings",
      description: "Configure global site settings",
      icon: Settings,
      link: "#",
      disabled: true,
    },
  ]

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground">Manage your gaming platform content and settings</p>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Admin Modules</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to the Admin Console, {session?.user?.name}</CardTitle>
              <CardDescription>
                You have admin privileges on Papa-Pi Gaming. Use the tools below to manage the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminModules.slice(0, 3).map((module) => (
                  <Card key={module.id} className={module.disabled ? "opacity-70" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{module.name}</CardTitle>
                      <module.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild disabled={module.disabled} className="w-full">
                        <Link href={module.link}>{module.disabled ? "Coming Soon" : "Manage"}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-md border p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <GameController className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Featured Toon Updated</p>
                    <p className="text-xs text-muted-foreground">You updated the Mechanic character image</p>
                  </div>
                  <div className="text-xs text-muted-foreground">Just now</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminModules.map((module) => (
              <Card key={module.id} className={module.disabled ? "opacity-70" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{module.name}</CardTitle>
                  <module.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild disabled={module.disabled} className="w-full">
                    <Link href={module.link}>{module.disabled ? "Coming Soon" : "Manage"}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
