"use client"

import React, { useState } from "react"
import { usePostHog } from 'posthog-js/react'
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PromptInput } from "@/components/PromptInput"
import { saveChatConversation } from "@/actions/chat-conversations"

export function LandingPrompt() {
  const { data: session, status } = useSession()
  const posthog = usePostHog()
  const router = useRouter()
  const [generating, setGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")

  const handleSendMessage = async (message: any) => {
    // Require authentication
    if (status !== 'authenticated') {
      // Track the prompt they entered before signup/login
      try {
        posthog.capture('landing prompt before signup', { prompt: prompt })
      } catch (err) {
        console.error('PostHog capture error:', err)
      }
      signIn(undefined, { callbackUrl: '/' })
      return
    }
    setError(null)
    setGenerating(true)
    try {
      // Create new chat conversation
      const result = await saveChatConversation({ files: {}, messages: [] })
      const id = result.id
      // Flag for processing after redirect
      localStorage.setItem(
        'chatToProcess',
        JSON.stringify({ id, message: message.content.text, image: message.content.image, timestamp: Date.now() })
      )
      router.push(`/chat/${id}`)
    } catch (err: any) {
      console.error('Failed to create chat:', err)
      setError(err.message || 'Failed to create chat')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <PromptInput
        height={80}
        onSendMessage={handleSendMessage}
        input={prompt} // we have this because PromptInput ignores empty inputs
        setInput={setPrompt}
        handleInputChange={e => setPrompt(e.target.value)}
        generating={generating}
        onError={(e) => setError(e)}
      />
      {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
    </>
  )
}
