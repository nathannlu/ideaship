"use client"

import React from 'react'
//import { IframePreview } from '@/components/VirtualReactRenderer/iframe'

interface ChatSessionPreviewProps {
  files: Record<string, string>
}


export default function ChatSessionPreview({ files }: ChatSessionPreviewProps) {
  return (
    <div className="h-full w-full relative">
      {/*
      <IframePreview files={files} disableEditorFeatures={true} />
      */}

      {/* "Made in Ideaship" tag */}
      <a href="https://ideaship.io" target="_blank">
        <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-md opacity-70 hover:opacity-100 transition-opacity" style={{ border: "1px solid white" }}>
          Made in Ideaship
        </div>
      </a>
    </div>
  )
}
