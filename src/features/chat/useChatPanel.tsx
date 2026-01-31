// features/chat/useChatPanel.ts
"use client";

import { useChat, Message } from "ai/react";
import { useEffect } from "react";
import { useImmer } from "use-immer";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  saveFiles,
  Message as CustomMessage,
} from "@/actions/chat-conversations";
import { useFileManager } from "@/vfs";
import { processResponse } from "./responseProcessor";

export interface UseChatPanel {
  messages: Message[];
  input: string;
  status: "idle" | "submitting" | "submitted" | "streaming";
  isBotThinking: boolean;
  isLoading: boolean;
  credits: number;
  error: string | null;
  attachments: FileList | undefined;

  /* actions */
  setInput: (t: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  send: (imageUrl?: string) => Promise<void>;
  stop: () => void;
  setAttachments: (f: FileList | undefined) => void;
  clearError: () => void;
  closeCreditModal: () => void;
  creditModalOpen: boolean;
}

export function useChatPanel(initialMessages: CustomMessage[]): UseChatPanel {
  /* params & session ----------------------------------------------------- */
  const params = useParams();
  const { data: session } = useSession();
  const conversationId = params?.id as string | undefined;
  const userId = session?.user?.id;

  /* files manager -------------------------------------------------------- */
  const { files, extractCodebase, createFilesBulk } = useFileManager();

  /* local UI state ------------------------------------------------------- */
  const [ui, updateUI] = useImmer({
    credits: 0,
    creditModalOpen: false,
    error: null as string | null,
    attachments: undefined as FileList | undefined,
  });

  /* chat SDK ------------------------------------------------------------- */
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setInput,
    isLoading,
    stop,
    status,
    append,
  } = useChat({
    api: "/api/generate-code",
    id: conversationId || undefined,
    sendExtraMessageFields: true,
    initialMessages: initialMessages.map((m) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
      createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
    })) as Message[],
    body: { codebaseInfo: extractCodebase(files) },
    async onFinish(message) {
      try {
        const processed = processResponse(message.content as string);
        const created = createFilesBulk(processed.filesToCreate);
        if (conversationId) await saveFiles(conversationId, created);
      } catch (err: any) {
        updateUI((d) => { d.error = err.message; });
      }
    },
    onError(err) {
      updateUI((d) => { d.error = err.message || "An error occurred"; });
    },
  });

  /* initialize credits from session to avoid separate API call */
  useEffect(() => {
    const sessionCredits = session?.user?.credits;
    if (typeof sessionCredits === 'number') {
      updateUI(d => { d.credits = sessionCredits; });
    }
  }, [session?.user?.credits]);

  /* localStorage bridge -------------------------------------------------- */
  // this is used to process messages from the "send to fix" button, or initial
  // messages when the user submits input from another page.
  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem("chatToProcess");
      if (!raw) return;
      try {
        const { message } = JSON.parse(raw);
        if (message) {
          append({ role: "user", content: message });
          localStorage.removeItem("chatToProcess");
        }
      } catch {}
    };
    handler();
    window.addEventListener("storage", handler);
    window.addEventListener("localStorageChange", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("localStorageChange", handler);
    };
  }, [append]);

  /* send wrapper with credit check -------------------------------------- */
  const send = async (imageUrl?: string) => {
    if (ui.credits <= 0) {
      updateUI((d) => { d.creditModalOpen = true; });
      return;
    }
    try {
      await handleSubmit(
        new Event("submit") as unknown as React.FormEvent<HTMLFormElement>,
        {
          experimental_attachments: imageUrl
            ? [{ url: imageUrl, contentType: "image/*" }]
            : [],
        }
      );
      updateUI((d) => { d.credits = Math.max(d.credits - 1, 0); d.attachments = undefined; });
    } catch (err: any) {
      if (err.message?.includes("credit")) {
        updateUI((d) => { d.creditModalOpen = true; });
      } else {
        updateUI((d) => { d.error = err.message; });
      }
    }
  };

  /* public API ----------------------------------------------------------- */
  return {
    messages,
    input,
    status,
    isBotThinking: status === "submitted",
    isLoading,
    credits: ui.credits,
    error: ui.error,
    attachments: ui.attachments,
    setInput,
    handleInputChange,
    send,
    stop,
    setAttachments: (f) => updateUI((d) => { d.attachments = f; }),
    clearError: () => updateUI((d) => { d.error = null; }),
    creditModalOpen: ui.creditModalOpen,
    closeCreditModal: () => updateUI((d) => { d.creditModalOpen = false; }),
  };
}
