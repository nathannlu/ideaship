"use client";

import { ChatMessageList } from "@/features/chat/ChatMessageList";
import { PromptInput } from "@/components/PromptInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useChatPanel } from "./useChatPanel";
import React from "react";

type Props = { initialMessages: import("@/actions/chat-conversations").Message[] };

export function ChatPanel({ initialMessages }: Props) {
  const chat = useChatPanel(initialMessages);

  return (
    <>
      <div className="flex flex-col md:h-full h-[calc(100vh-4rem)] gap-2">
        <ChatMessageList
          messages={chat.messages}
          isBotThinking={chat.isBotThinking}
          sessionLoading={false}
          status={chat.status}
        />

        <PromptInput
          onSendMessage={({ content: { text, image } }) => {
            chat.setInput(text);
            chat.send(image);
          }}
          generating={chat.isLoading}
          onError={chat.clearError}
          input={chat.input}
          handleInputChange={chat.handleInputChange}
          setInput={chat.setInput}
          stop={chat.stop}
          onAttachments={chat.setAttachments}
        />

        {chat.error && <p className="text-red-500 mt-2">{chat.error}</p>}
      </div>

      <Dialog open={chat.creditModalOpen} onOpenChange={chat.closeCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insufficient Credits</DialogTitle>
            <DialogDescription>
              You’ve run out of credits. Purchase more to continue chatting.
            </DialogDescription>
            <DialogDescription>10 credits for $5 USD.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              size="lg"
              onClick={() =>
                window.open(
                  "https://buy.stripe.com/7sI9Bi6wP9O13NScMO",
                  "_blank"
                )
              }
            >
              Purchase Credits
            </Button>
          </div>
          <DialogFooter>
            <div className="text-xs text-muted-foreground">
              Payments processed by Stripe. Credits added automatically.
            </div>
            <Button variant="ghost" onClick={chat.closeCreditModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}