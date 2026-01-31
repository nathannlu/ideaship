import type { DraftState } from "../useEditingPanel";
import React, { useState } from "react";
import { Icons } from "@/components/icons";

export interface ImageEditorProps {
    draft: DraftState;
    updateDraft: (fn: (d: DraftState) => void) => void;
    uploadImage: (f: File) => Promise<void>;
  }
  
  export const ImageEditor: React.FC<ImageEditorProps> = ({ draft, updateDraft, uploadImage }) => {
    const [loading, setLoading] = useState<boolean>(false);

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLoading(true);
                try {
                  await uploadImage(file);
                } finally {
                  setLoading(false);
                }
              }
            }}
          />
          {loading && (
            <Icons.spinner className="h-5 w-5 animate-spin" />
          )}
        </div>
        {draft.imageUrl && (
          <img src={draft.imageUrl} alt="Selected" className="max-h-40 rounded-md" />
        )}
      </div>
    );
  };