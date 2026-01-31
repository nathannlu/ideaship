"use client";
import { useEffect, useRef, useState } from "react";
import { bundleReactFilesIntoIframe } from "@/bundler";
import type { IframePreviewHandle } from "./IframePreview";

export interface UseIframePreview {
  loading: boolean;
  iframeSrc: string | null;
  refresh: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  methods: IframePreviewHandle;
}


export function useIframePreview(
  files: Record<string, string>,
  { onError, previewRef }: { onError?: (e: string) => void; previewRef?: React.RefObject<any> }
): UseIframePreview {
  const lastBlob = useRef<string | null>(null);
  const prevFiles = useRef<Record<string, string> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const build = async (force = false) => {
    //if (!force && !hasFilesChanged(files, prevFiles.current))
    if (!force && JSON.stringify(prevFiles.current) === JSON.stringify(files))
      return;

    setLoading(true);
    try {
      // add ids to files should be here
      const blob = await bundleReactFilesIntoIframe({ files, forceRefresh: force });
      const url = URL.createObjectURL(blob);
      prevFiles.current = files;
      setIframeSrc(url);
      if (lastBlob.current) URL.revokeObjectURL(lastBlob.current);
      lastBlob.current = url;
    } catch (err: any) {
      onError?.(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  /* build on mount & files change -------------------------------------- */
  useEffect(() => { build(); return () => { lastBlob.current && URL.revokeObjectURL(lastBlob.current); }; }, [files]);

  const refresh = () => build(true);

  /* methods exposed to parent (these are just placeholders now) --------- */
  // These methods are defined in IframePreview.tsx using useImperativeHandle
  const methods: IframePreviewHandle = {
    navigateLink: (id: string) => {
      console.error('navigateLink should be implemented in IframePreview.tsx');
    },
    getBundledHtml: async () => {
      if (!iframeSrc) await build(true);
      const res = await fetch(iframeSrc!);
      return res.text();
    },
  };

  return { loading, iframeSrc, refresh, iframeRef, methods };
}