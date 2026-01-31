"use client";

import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { useEditingPanel } from "./useEditingPanel";
import { ImageEditor } from "./editors/ImageEditor";
import { LinkEditor } from "./editors/LinkEditor";
import { ButtonEditor } from "./editors/ButtonEditor";
import { IconEditor } from "./editors/IconEditor";
import { LayoutEditor } from "./editors/LayoutEditor";
import { TextEditor } from "./editors/TextEditor";

type Props = {
  conversationId: string | null;
  setTab: (t: "Generate" | "Edit") => void;
  previewRef: React.RefObject<any>;
};

export function EditingPanel({ conversationId, setTab, previewRef }: Props) {
  const {
    selected,
    draft,
    isLayout,
    updateDraft,
    deleteSelected,
    save,
    uploadImage,
    navigateToLink,
  } = useEditingPanel(conversationId, setTab, previewRef);

  if (!selected) {
    return (
      <EmptyBanner msg="Click an element in the preview to edit it." />
    );
  }

  const commonProps = { draft, updateDraft };

  /* choose sub‑editor by tag --------------------------------------------- */
  const Editor = (() => {
    switch (selected.tag) {
      case "img":           return <ImageEditor {...commonProps} uploadImage={uploadImage} />;
      case "a":
      case "Link":          return <LinkEditor {...commonProps} navigateToLink={navigateToLink} />;
      case "button":
      case "Button":        return <ButtonEditor {...commonProps} navigateToLink={navigateToLink} />;
      case "i":
      case "svg":
      case "icon":          return <IconEditor {...commonProps} />;
      default:
        return isLayout
          ? <LayoutEditor {...commonProps} />
          : <TextEditor {...commonProps} />;
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<Spinner />}>{Editor}</Suspense>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={deleteSelected}>
          Delete
        </Button>
        <Button onClick={save} disabled={draft.wantLink && !draft.linkUrl.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* trivial helpers ----------------------------------------------------------*/
const EmptyBanner = ({ msg }: { msg: string }) => (
  <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border rounded-md p-6">
    <p>{msg}</p>
  </div>
);

const Spinner = () => <div className="animate-spin h-6 w-6 border-2 rounded-full" />;