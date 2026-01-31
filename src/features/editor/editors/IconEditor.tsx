import { ColorPicker } from "@/components/ui/color-picker";
import { IconSelector } from "@/components/ui/icon-selector";
import type { DraftState } from "../useEditingPanel";
import React from "react";

export interface IconEditorProps {
    draft: DraftState;
    updateDraft: (fn: (d: DraftState) => void) => void;
  }
  
  export const IconEditor: React.FC<IconEditorProps> = ({ draft, updateDraft }) => (
    <div className="flex flex-col gap-4">
      <IconSelector
        value={draft.icon}
        onChange={(icon) => updateDraft((d) => void (d.icon = d.text = icon))}
      />
      <ColorPicker label="Icon Color" value={draft.color} onChange={(v) => updateDraft((d) => void (d.color = v))} />
    </div>
  );