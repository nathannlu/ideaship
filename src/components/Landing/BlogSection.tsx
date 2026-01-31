import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Component() {

  return (
    <section className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">
          Read how you can turn your app into a business
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          At our company, we take a unique approach to financial problem-solving, providing innovative solutions
          tailored to the needs of individuals and small businesses.
        </p>
      </div>


      <Card className="bg-zinc-800 flex flex-wrap flex-row overflow-hidden shadow-lg">
        <CardHeader className="flex flex-1 mb-4 gap-2">
          <h4 className="font-bold font-lg text-blue-500">
            Blog
          </h4>

          <CardTitle className="text-2xl text-white">
            How I Turned an AI Side Project into a Monetized App in 6 Months
          </CardTitle>

          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src="https://avatars.githubusercontent.com/u/24965772?v=4" alt="User avatar" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">Nathan Lu</span>
              <span className="text-sm text-zinc-400">Founder</span>
            </div>
          </div>

          <CardDescription className="text-zinc-400">
            When I first started building, I searched everywhere for real, detailed breakdowns of how people got traffic or made money with their apps. This post is me writing what I wish I had found — a clear, honest look at what actually worked and what didn’t.
          </CardDescription>
          <div>
            <Link href="/blog/monetizing-ai-app" className="text-blue-500 hover:underline">
              <Button size="sm">
                Read more
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex flex-[1.2] p-0 bg-zinc-300 rounded-md">
          <img src="/blog/comfyui-cloud/comfy-cloud-cover.png" className="w-full object-cover" />
        </CardContent>
      </Card>
    </section>
  )
}

