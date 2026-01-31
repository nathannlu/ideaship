import { useCallback, useEffect } from "react";
import { useImmer } from "use-immer";
import { toast } from "@/hooks/use-toast";
import { saveFiles } from "@/actions/chat-conversations";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useElementSelection } from "@/lib/element-selection-stream";
import { useFileManager } from "@/vfs";
import { patchFiles, convertButtonToLink, unwrapLink, deleteElement } from "./codeTransformers"
import { layoutTags } from "./constants";

/* -------------------------------------------------------------------------- */
// Types
/* -------------------------------------------------------------------------- */
export interface DraftState {
  text: string;
  bg: string;
  color: string;
  icon: string;
  linkUrl: string;
  wantLink: boolean;
  isWrapped: boolean;
  imageUrl: string;
}

/** Hook public API returned to the EditingPanel component */
export interface UseEditingPanel {
  selected: ReturnType<typeof useElementSelection>["selectedElement"];
  draft: DraftState;
  isLayout: boolean;
  updateDraft: (fn: (d: DraftState) => void) => void;
  deleteSelected: () => Promise<void>;
  save: () => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  navigateToLink: () => void | undefined;
}

/* -------------------------------------------------------------------------- */
// Hook implementation
/* -------------------------------------------------------------------------- */
export function useEditingPanel(
  conversationId: string | null,
  setTab: (t: "Generate" | "Edit") => void,
  previewRef: React.RefObject<any>
): UseEditingPanel {
  /* file‑system helpers --------------------------------------------------- */
  const { files, createFilesBulk } = useFileManager();
  const selected = useElementSelection((s) => s.selectedElement);
  const isLayout = layoutTags.includes((selected?.tag ?? "") as any);

  /* draft state ----------------------------------------------------------- */
  const [draft, updateDraft] = useImmer<DraftState>({
    text: "",
    bg: "",
    color: "",
    icon: "",
    linkUrl: "",
    wantLink: false,
    isWrapped: false,
    imageUrl: "",
  });

  /* Sync incoming selection → draft -------------------------------------- */
  useEffect(() => {
    if (!selected) return;
    updateDraft((d) => {
      d.text = selected.content ?? "";
      d.bg = selected.style?.backgroundColor ?? "";
      d.color = selected.style?.color ?? "";
      d.icon = selected.metadata?.iconName ?? "";

      if (selected.tag === "button") {
        d.linkUrl = selected.metadata?.linkUrl ?? "";
        d.wantLink = !!d.linkUrl;
        d.isWrapped = !!d.linkUrl;
      } else {
        if (selected.metadata?.linkUrl) {
          d.linkUrl = selected.metadata?.linkUrl
        } else {
          d.linkUrl = "";
        }
        d.wantLink = false;
        d.isWrapped = false;
      }
      if (selected.tag === "img") {
        d.imageUrl = selected.metadata.src ?? "";
      } else {
        d.imageUrl = "";
      }
    });
  }, [selected, updateDraft]);

  /* delete ---------------------------------------------------------------- */
  const deleteSelected = useCallback(async () => {
    if (!conversationId || !selected) return;
    const updated = deleteElement(files, selected.id);
    if (!updated) return;

    createFilesBulk(updated);
    await saveFiles(conversationId, updated);
    setTab("Generate");
  }, [conversationId, selected, files, createFilesBulk, setTab]);

  /* save ------------------------------------------------------------------ */
  const save = useCallback(async () => {
    if (!conversationId || !selected) return;

    let nextFiles = { ...files };
    let textToSave: string | undefined = isLayout ? undefined : draft.text;
    const styleToSave = {
      backgroundColor: draft.bg || undefined,
      color: isLayout ? undefined : draft.color || undefined,
    } as const;

    /* image */
    if (selected.tag === "img") {
      textToSave = draft.imageUrl || draft.text;
    }

    /* button link handling ---------------------------------------------- */
    if (selected.tag === "button" || selected.tag === "Button") {
      if (draft.wantLink && !draft.linkUrl.trim()) {
        toast({
          title: "URL required",
          description: "Please enter a URL for the button link.",
          variant: "destructive",
        });
        return;
      }

      const needWrap = draft.wantLink && !draft.isWrapped;
      const needUnwrap = !draft.wantLink && draft.isWrapped;
      const needUpdate = draft.wantLink && draft.isWrapped;

      if (needWrap) {
        nextFiles = convertButtonToLink(files, selected.id, draft.linkUrl) ?? nextFiles;
      } else if (needUnwrap) {
        nextFiles = unwrapLink(files, selected.id) ?? nextFiles;
      } else if (needUpdate) {
        // this case occurs when user wants to edit the link url
        // of a wrapped button
        textToSave = draft.text;
        const updated = convertButtonToLink(files, selected.id, draft.linkUrl);
        if (updated) {
          nextFiles = updated;
        }
      }
    }

    /* link consistency ----------------------------------------------- */
    if (selected.tag === "a" || selected.tag === "Link") {
      textToSave = draft.text;
    }

    /* patch & persist -------------------------------------------------- */
    const patched = patchFiles(nextFiles, selected.id, { 
      newText: textToSave, 
      styles: styleToSave,
      linkUrl: (selected.tag === "a" || selected.tag === "Link" || (selected.tag === "button" && draft.wantLink)) ? draft.linkUrl : undefined
    });

    if (patched && patched !== files) {
      createFilesBulk(patched);
      setTab("Generate");
      
      saveFiles(conversationId, patched);
    }
  }, [conversationId, selected, draft, files, createFilesBulk, isLayout, setTab]);

  /* image upload --------------------------------------------------------- */
  // Set up the image upload hook
  const { uploadImage: uploadToS3 } = useImageUpload({
    maxFileSize: 1 * 1024 * 1024, // 1MB
    folderPath: 'editor',
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Use the hook in the uploadImage method
  const uploadImage = useCallback(
    async (file: File) => {
      if (!conversationId || !selected) return;
      
      try {
        const url = await uploadToS3(file);
        if (url) {
          updateDraft((d) => {
            d.imageUrl = url;
            d.text = url;
          });
        }
      } catch (err) {
        console.error("upload error", err);
      }
    },
    [conversationId, selected, updateDraft, uploadToS3]
  );

  const navigateToLink = () => {
    if (previewRef.current && selected?.id && typeof previewRef.current.navigateLink === 'function') {
      previewRef.current.navigateLink(selected.id);
    } else {
      console.error('navigateLink not available or selected element has no id');
    }
  };

  /* public --------------------------------------------------------------- */
  return {
    selected,
    draft,
    isLayout,
    updateDraft,
    deleteSelected,
    save,
    uploadImage,
    navigateToLink
  };
}