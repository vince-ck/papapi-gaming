import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Gamepad2, Star, Trophy } from "lucide-react"

export function FeaturedGames() {
  const featuredGames = [
    {
      id: 1,
      title: "Cyber Legends",
      image: "/neon-cityscape.png",
      rating: 4.8,
      category: "Action RPG",
    },
    {
      id: 2,
      title: "Space Explorers",
      image: "/interstellar-discovery.png",
      rating: 4.6,
      category: "Adventure",
    },
    {
      id: 3,
      title: "Fantasy Kingdom",
      image: "/enchanted-forest-kingdom.png",
      rating: 4.7,
      category: "Strategy",
    },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Featured Games</h2>
        <Button variant="link" className="text-primary">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredGames.map((game) => (
          <Card key={game.id} className="overflow-hidden border-border/40 bg-card/50 transition-all hover:bg-card/80">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <Image
                src={game.image || "/placeholder.svg"}
                alt={game.title}
                fill
                className="object-cover transition-transform hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span>{game.rating}</span>
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-blue-500/90 p-1">
                <Trophy className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{game.title}</h3>
                  <p className="text-xs text-muted-foreground">{game.category}</p>
                </div>
                <Button size="sm" className="gap-1">
                  <Gamepad2 className="h-4 w-4" />
                  <span>Play</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
