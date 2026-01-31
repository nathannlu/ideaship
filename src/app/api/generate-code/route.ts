import { NextResponse } from "next/server";
import { appendResponseMessages, streamText, Message, Attachment } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
//import { deepseek } from "@ai-sdk/deepseek"
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "@/prompts/system_prompt";

export const runtime = "edge";

interface RequestBody {
  messages: Message[];
  id: string;
  codebaseInfo: string;
  attachments?: Attachment[];
}

// API route to generate code using Claude
export async function POST(request: Request) {
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // maybe here i can accept json id, send request to my api route that checks
  // if token is valid and for credits, before continuing to the stream

  const { messages, id, codebaseInfo, attachments } = jsonBody as RequestBody;
  
  // Forward incoming cookies to credit processing endpoint
  const cookieHeader = request.headers.get("cookie") || "";
  const creditResponse = await fetch(
    new URL("/api/chat/process", request.url),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cookie": cookieHeader,
      },
      body: JSON.stringify({}),
    }
  );

  const creditData = await creditResponse.json();
  if (!creditResponse.ok || !creditData.success) {
    return NextResponse.json(
      { error: creditData.error || "Insufficient credits" },
      { status: creditResponse.status || 403 }
    );
  }
  // Extract userId for saving chat history
  const userId = creditData.userId;

  try {
    const result = await streamText({
      model: anthropic("claude-3-7-sonnet-20250219"),
      //model: deepseek('deepseek-reasoner'),
      //model: google('gemini-2.5-flash-preview-05-20'),
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `This is my codebase. ` + codebaseInfo } as Message,
        {
          role: "assistant",
          content: "I'm ready to help",
        } as Message,
        ...messages
      ],
      temperature: 0,
      maxTokens: 8000,
      experimental_continueSteps: true,
      maxSteps: 5,
      experimental_attachments: attachments,
      providerOptions: {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 3000,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 2048,
            includeThoughts: true
          },
        }
      },
      async onFinish({ response }) {
        const messagesToSave = appendResponseMessages({
          messages, // Only save the original messages, not our added ones
          responseMessages: response.messages,
        });

        // Save the chat conversation to the database
        // Instead of directly using Prisma in Edge, make a request to a separate API route
        try {
          // Use the internal API that doesn't require auth cookies
          const saveResponse = await fetch(new URL('/api/chat/db-save', request.url), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              "cookie": cookieHeader,
            },
            body: JSON.stringify({
              id,
              userId,
              messages: messagesToSave,
              files: {}, // Add empty files object
            }),
          });
          
          if (!saveResponse.ok) {
            const errorData = await saveResponse.json();
            console.error("Error saving chat:", errorData);
          } else {
            const result = await saveResponse.json();
            console.log("Successfully saved chat:", result);
          }
        } catch (saveError) {
          console.error("Error saving chat:", saveError);
        }
      },
    });

    // consume the stream to ensure it runs to completion & triggers onFinish
    // even when the client response is aborted:
    result.consumeStream(); 

    // Just use the built-in Vercel AI SDK functionality for reasoning
    return result.toDataStreamResponse({
      sendReasoning: true, // This is all we need!
    });
  } catch (err: any) {
    console.error("Error generating code", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
