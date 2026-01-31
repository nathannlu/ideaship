"use client"
import React from "react"
// Static templates page with Navbar
import NavBar from "@/components/NavBar"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"


const templates = [
  {
    id: "681ead9dec79bb9fffe95559",
    title: "SaaS Template 1",
    imageSrc: "/saas_template1.png",
  },
  {
    id: "682610397b48d43c8af9157c",
    title: "SaaS Template 2",
    imageSrc: "/saas_template2.png",
  },
]

export default function TemplatesPage() {
  const { data: session } = useSession()
  // handle fork: if not logged in, prompt sign in
  const handleFork = async (id: string) => {
    if (!session) {
      await signIn(undefined, { callbackUrl: window.location.href })
      return
    }
    try {
      const response = await fetch(`/api/chat/fork/${id}`, { method: "POST" })
      if (!response.ok) throw new Error("Failed to fork template")
      const data = await response.json()
      window.location.href = `/chat/${data.id}`
    } catch (err) {
      console.error("Error forking template:", err)
    }
  }

  return (
    <div className="relative">
      {/* Navbar from landing page */}
      <NavBar />
      <div className="container mx-auto py-8 px-4 max-w-7xl pt-20">
        <div className="flex flex-col items-start gap-4 mb-8">
          <h1 className="text-3xl font-bold">Customizable templates</h1>
          <p className="text-gray-500">
            Build a website tailored to your needs with our curated collection of website templates — fully customizable and built for seamless, responsive web design.
          </p>
        </div>

        <Separator className="mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle>{template.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={template.imageSrc}
                  alt={template.title}
                  className="w-full h-auto rounded-md mb-4"
                />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Template</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between mt-auto">
                <a
                  href={`https://${template.id}.ideaship.io`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">View App</Button>
                </a>
                <Button type="button" onClick={() => handleFork(template.id)}>
                  Fork Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
