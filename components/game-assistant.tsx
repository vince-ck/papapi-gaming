import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Send, Sparkles } from "lucide-react"
import { PapaPiLogo } from "@/components/papa-pi-logo"

export function GameAssistant() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Gaming Assistant</h2>
        <Button variant="link" className="text-primary">
          View History
        </Button>
      </div>
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <PapaPiLogo size="md" />
              <div className="flex flex-col">
                <span className="font-bold">Papa-Pi</span>
                <span className="text-xs text-muted-foreground">Gaming Assistant</span>
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            Your personal gaming companion. Ask for tips, walkthroughs, or game recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <PapaPiLogo size="sm" />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>Hello! I'm Papa-Pi, your gaming assistant. How can I help you today?</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pl-12">
              <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
                <p>I need help with the final boss in Cyber Legends.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center">
                <PapaPiLogo size="sm" />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>For the final boss in Cyber Legends, you'll want to:</p>
                <ul className="ml-4 mt-2 list-disc space-y-1">
                  <li>Use EMP grenades during the shield phase</li>
                  <li>Target the glowing weak points on its back</li>
                  <li>Save your ultimate ability for the final 25% of health</li>
                </ul>
                <p className="mt-2">Would you like more specific strategies?</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Sparkles className="h-4 w-4" />
              <span>Game Tips</span>
            </Button>
            <Button variant="outline" size="sm">
              Walkthroughs
            </Button>
            <Button variant="outline" size="sm">
              Recommendations
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Ask Papa-Pi anything..." className="bg-background" />
            <Button size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
