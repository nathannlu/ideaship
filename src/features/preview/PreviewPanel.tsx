"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { PreviewToolbar } from "./PreviewToolbar";
import { IframePreview } from "./IframePreview";
import { useIframePreview } from "./useIframePreview";

interface Props {
  files: Record<string, string>;
  previewError: string | null;
  generating: boolean;
  onError: (e: string | null) => void;
  onFix: () => void;
  previewRef?: React.RefObject<any>;
}

export function PreviewPanel({ files, previewError, generating, onError, onFix, previewRef }: Props) {
  const { loading, iframeSrc, refresh, iframeRef, methods } = useIframePreview(files, { onError, previewRef });

  return (
    <div className="flex-[1.5] p-4 flex flex-col h-full">
      {previewError && (
        <div className="mb-2">
          <p className="text-red-500 mb-2">{previewError}</p>
          <Button onClick={onFix} disabled={generating}>
            Send this to fix
          </Button>
        </div>
      )}

      <div className="rounded-lg border flex flex-col overflow-hidden flex-1">
        <PreviewToolbar host={typeof window !== "undefined" ? window.location.host : ""} onRefresh={refresh} />
        <IframePreview ref={previewRef as any} src={iframeSrc} loading={loading} iframeRef={iframeRef} />
      </div>
    </div>
  );
}