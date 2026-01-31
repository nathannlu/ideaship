import { ColorPicker } from "@/components/ui/color-picker";
import type { DraftState } from "../useEditingPanel";
import React from "react";

export interface LayoutEditorProps {
    draft: DraftState;
    updateDraft: (fn: (d: DraftState) => void) => void;
  }
  
  export const LayoutEditor: React.FC<LayoutEditorProps> = ({ draft, updateDraft }) => (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Layout elements can’t contain text. You can still tweak the background colour or delete the element.
      </p>
      <ColorPicker label="Background" value={draft.bg} onChange={(v) => updateDraft((d) => void (d.bg = v))} />
    </div>
  );