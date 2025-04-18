import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Swords, Rocket, Car, Brain, Users2, Gamepad2, Puzzle, Mountain } from "lucide-react"

export function GameCategories() {
  const categories = [
    { id: 1, name: "Action", icon: Swords, color: "bg-blue-500/20 text-blue-600" },
    { id: 2, name: "Adventure", icon: Mountain, color: "bg-blue-600/20 text-blue-700" },
    { id: 3, name: "Racing", icon: Car, color: "bg-sky-500/20 text-sky-600" },
    { id: 4, name: "Puzzle", icon: Puzzle, color: "bg-cyan-500/20 text-cyan-600" },
    { id: 5, name: "Strategy", icon: Brain, color: "bg-blue-500/20 text-blue-600" },
    { id: 6, name: "Multiplayer", icon: Users2, color: "bg-sky-600/20 text-sky-700" },
    { id: 7, name: "Sci-Fi", icon: Rocket, color: "bg-cyan-600/20 text-cyan-700" },
    { id: 8, name: "Arcade", icon: Gamepad2, color: "bg-blue-600/20 text-blue-700" },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Game Categories</h2>
        <Button variant="link" className="text-primary">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="border-border/40 bg-card/50 transition-all hover:bg-card/80 hover:shadow-md"
          >
            <CardContent className="flex flex-col items-center justify-center p-4">
              <div
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-sm ${category.color}`}
              >
                <category.icon className="h-6 w-6" />
              </div>
              <h3 className="text-center font-medium">{category.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
