import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export function RecentlyPlayed() {
  const recentGames = [
    {
      id: 1,
      title: "Mech Warriors",
      image: "/urban-mech-battle.png",
      lastPlayed: "2 hours ago",
      progress: 68,
    },
    {
      id: 2,
      title: "Racing Rivals",
      image: "/neon-city-race.png",
      lastPlayed: "Yesterday",
      progress: 42,
    },
    {
      id: 3,
      title: "Puzzle Master",
      image: "/colorful-geometric-puzzle.png",
      lastPlayed: "3 days ago",
      progress: 91,
    },
    {
      id: 4,
      title: "Zombie Survival",
      image: "/city-outbreak.png",
      lastPlayed: "Last week",
      progress: 23,
    },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Recently Played</h2>
        <Button variant="link" className="text-primary">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recentGames.map((game) => (
          <Card key={game.id} className="border-border/40 bg-card/50 transition-all hover:bg-card/80">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-md">
                  <Image src={game.image || "/placeholder.svg"} alt={game.title} fill className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-medium">{game.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{game.lastPlayed}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${game.progress}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
