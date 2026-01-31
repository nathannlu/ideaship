"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { injectWebsiteBuilderNodeHoverStyles } from "./hoverCss";
import { useElementSelection } from "@/lib/element-selection-stream";

export interface IframePreviewHandle {
  navigateLink: (id: string) => void;
  getBundledHtml: () => Promise<string | null>;
}

interface Props {
  src: string | null;
  loading: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export const IframePreview = forwardRef<IframePreviewHandle, Props>(
  ({ src, loading, iframeRef }, ref) => {
    // Set up imperative handle to expose methods to parent
    useImperativeHandle(ref, () => ({
      navigateLink: (id: string) => {
        const iframe = iframeRef.current;
        if (!iframe) {
          console.error('Iframe element not found');
          return;
        }

        const doc = iframe.contentDocument;
        if (!doc) {
          console.error('Could not access iframe content document');
          return;
        }

        // Find the element by data-id
        const elem = doc.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
        if (elem) {
          // If it's not an anchor, look for the closest <a> ancestor
          let linkEl: HTMLElement | null = null;
          if (elem.tagName.toLowerCase() === 'a') {
            linkEl = elem;
          } else {
            linkEl = elem.closest('a');
          }
          
          if (linkEl) {
            try {
              // Bypass click blocker and trigger link click
              linkEl.setAttribute('data-allow-navigation', 'true');
              linkEl.click();
            } catch (err) {
              console.error('Failed to navigate link inside iframe:', err);
            }
          }
        }
      },
      getBundledHtml: async () => {
        if (!src) return null;
        const res = await fetch(src);
        return res.text();
      }
    }), [iframeRef, src]);
    const [html, setHtml] = useState<string | null>(null);

    useEffect(() => {
      if (!src) return;
      const el = iframeRef.current;
      if (!el) return;

      const onLoad = () => {
        const doc = el.contentDocument;
        if (!doc || !doc.body) return;

        // 1. Inject hover styles
        const style = doc.createElement("style");
        style.textContent = injectWebsiteBuilderNodeHoverStyles;
        doc.head.appendChild(style);
        console.log("✅ Injected hover CSS");

        // 2. Hover handlers
        doc.body.addEventListener("mouseover", (e: MouseEvent) => {
          const target = (e.target as HTMLElement)?.closest("[data-id]");
          if (!target) return;
          target.setAttribute("data-hov", "true");

          const tag = target.tagName.toLowerCase();
          let label = tag;
          if (["div", "section", "header", "footer", "aside", "nav", "main", "article"].includes(tag)) {
            label = "layout";
          } else if (tag.match(/^h[1-6]$/)) {
            label = "heading";
          }
          target.setAttribute("data-tag-label", label);
        });

        doc.body.addEventListener("mouseout", (e: MouseEvent) => {
          const target = (e.target as HTMLElement)?.closest("[data-id]");
          if (!target) return;
          target.removeAttribute("data-hov");
          target.removeAttribute("data-tag-label");
        });

        // 3. Prevent navigation
        doc.body.addEventListener("click", (e) => {
          const a = (e.target as HTMLElement).closest("a");
          if (a && !a.hasAttribute("data-allow-navigation")) {
            e.preventDefault();
          }
        }, true);

        // 4. Selection handler
        doc.body.addEventListener("click", (e) => {
          const raw = e.target as HTMLElement;
          const target = raw.closest("[data-id]") as HTMLElement | null;
          if (!target) return;

          const id = target.dataset.id!;
          const tag = target.tagName.toLowerCase();
          const content = target.textContent || "";
          const style = getComputedStyle(target);
          const metadata: Record<string, any> = {};

          if (tag === "img") {
            metadata.src = (target as HTMLImageElement).src;
          } else if (tag === "button") {
            const link = target.closest("a");
            if (link) metadata.linkUrl = link.getAttribute("href");
          } else if (tag === "a") {
            metadata.linkUrl = target.getAttribute("href");
          }

          useElementSelection.getState().setSelectedElement({
            id,
            tag,
            content,
            style: {
              backgroundColor: style.backgroundColor,
              color: style.color,
            },
            metadata,
          });
        });

        // 5. Save HTML for export
        fetch(src)
          .then((res) => res.text())
          .then((htmlText) => setHtml(htmlText))
          .catch(() => setHtml(null));
      };

      el.addEventListener("load", onLoad);
      return () => el.removeEventListener("load", onLoad);
    }, [src]);

    return (
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src ?? "about:blank"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
          className="w-full h-full border-none"
        />
      </div>
    );
  }
);