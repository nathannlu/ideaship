// components/chat/ChatBubble.tsx
"use client";
import React, { memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleCheck } from "lucide-react";
import { Segment, parseStreaming } from "./parseArtifacts";

/* ------------------------------------------------------------------ */
/*  tiny helpers                                                      */
/* ------------------------------------------------------------------ */

const Narrative = memo(function Narrative({ text }: { text: string }) {
  return text.trim()
    ? <div className="mb-2 whitespace-pre-wrap">{text.trim()}</div>
    : null;
});

const RenderAction = memo(function RenderAction({
  segment,
}: {
  segment: Extract<Segment, { type: "action" }>;
}) {
  const { attrs, loading } = segment;
  return (
    <div className="flex items-center">
      {loading ? (
        <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-2" />
      ) : (
        <CircleCheck className="text-green-500 mr-2" />
      )}
      <span className="text-sm">{attrs.description ?? attrs.filePath}</span>
    </div>
  );
});

function containsIdeashipAction(str: string) {
  return str.includes("<ideashipAction");
}

/* ------------------------------------------------------------------ */
/*  RenderArtifact                                                    */
/* ------------------------------------------------------------------ */

const RenderArtifact = memo(function RenderArtifact({
  segment,
}: {
  segment: Extract<Segment, { type: "artifact" }>;
}) {
  const { content, attrs, loading } = segment;
  const title = attrs.title || attrs.id || "Artifact";

  const [parsedContent, setParsedContent] =
    React.useState<React.ReactNode>(null);

  useEffect(() => {
    if (!content) return;

    if (containsIdeashipAction(content)) {
      const segments = parseStreaming(content);
      const actions = segments.filter((s) => s.type === "action");
      const texts = segments.filter((s) => s.type === "text");

      setParsedContent(
        <>
          {texts.map(
            (s, i) =>
              s.type === "text" && <Narrative key={`t-${i}`} text={s.content} />
          )}

          {actions.length > 0 && (
            <ul className="mt-2 space-y-2 list-none pl-0">
              {actions.map(
                (s, i) =>
                  s.type === "action" && (
                    <li key={`a-${i}`} className="pl-0 ml-0">
                      <RenderAction segment={s} />
                    </li>
                  )
              )}
            </ul>
          )}
        </>
      );
    } else {
      setParsedContent(<ChatBubble raw={content} />);
    }
  }, [content]);

  return (
    <Card className="border-gray-600 bg-muted shadow-sm p-2 mb-2">
      <CardHeader className="p-2">
        <CardTitle className="text-base text-white">
          {title} {loading && "(Loading…)"}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-2">{parsedContent}</CardContent>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
/*  ChatBubble (root renderer)                                        */
/* ------------------------------------------------------------------ */

export const ChatBubble = memo(function ChatBubble({ raw }: { raw: string }) {
  const segments = React.useMemo(() => parseStreaming(raw), [raw]);

  return (
    <div className="group/message relative break-words rounded-lg p-3 text-sm bg-muted text-gray-300 duration-300 animate-in fade-in-0 zoom-in-75 origin-bottom-left">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <Narrative key={i} text={seg.content} />;
        if (seg.type === "artifact") return <RenderArtifact key={i} segment={seg} />;
        if (seg.type === "action") return <RenderAction key={i} segment={seg} />;
        return null;
      })}
    </div>
  );
});