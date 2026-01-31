"use client";
import React, { useRef, useEffect, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageReasoning } from "./message/ReasoningBlock";
import { ChatBubble } from "./message/ChatBubble";
import { Message } from "@/actions/chat-conversations";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { ChatMessage } from "@/components/ui/chat-message";


interface Props {
  messages: Message[];
  isBotThinking: boolean;
  sessionLoading: boolean;
  status: any;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isBotThinking,
  sessionLoading,
  status,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const sorted = React.useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime()
      ),
    [messages]
  );

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // rough fallback
    overscan: 10,
  });

  // Scroll to end on load and every new message
  useEffect(() => {
    if (rowVirtualizer.getVirtualItems().length > 0) {
      rowVirtualizer.scrollToIndex(sorted.length - 1, { align: "end" });
    }
  }, [sorted.length, rowVirtualizer]); 

  return (
    <div 
    className="relative flex flex-col flex-1 min-h-0"
    >
      {sessionLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div
        ref={parentRef}
        className="overflow-y-auto w-full"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const msg = sorted[virtualRow.index];
            const reasoning = extractReasoning(msg);

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-3"
              >
                {msg.role === "user" ? (
                  <ChatMessage 
                    id={virtualRow.index} 
                    role="user" 
                    content={msg.content} 
                    experimental_attachments={msg.experimental_attachments}
                  />
                ) : (
                  <>
                    {reasoning && (
                      <MessageReasoning 
                        reasoning={reasoning}
                        isLoading={status === 'streaming'}
                      />
                    )}
                    {msg.content && (
                      <ChatBubble raw={msg.content} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isBotThinking && (
        <div className="px-2">
          <TextShimmer className="font-mono text-sm" duration={3}>
            thinking…
          </TextShimmer>
        </div>
      )}
    </div>
  );
});

/* helper */
function extractReasoning(message: any): string | null {
  if (!Array.isArray(message.parts)) return null;
  for (const part of message.parts) {
    if (part?.type === "reasoning") {
      return (
        part.reasoning ||
        part.details?.filter((d: any) => d.type === "text").map((d: any) => d.text).join("\n") ||
        ""
      );
    }
  }
  return null;
}