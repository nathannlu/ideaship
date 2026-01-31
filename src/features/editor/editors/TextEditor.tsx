import { ColorPicker } from "@/components/ui/color-picker";
import type { DraftState } from "../useEditingPanel";
import React from "react";

export interface TextEditorProps {
    draft: DraftState;
    updateDraft: (fn: (d: DraftState) => void) => void;
  }
  
  export const TextEditor: React.FC<TextEditorProps> = ({ draft, updateDraft }) => (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full h-40 border p-2 rounded-md"
        value={draft.text}
        onChange={(e) => updateDraft((d) => void (d.text = e.target.value))}
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="Background" value={draft.bg} onChange={(v) => updateDraft((d) => void (d.bg = v))} />
        <ColorPicker label="Text" value={draft.color} onChange={(v) => updateDraft((d) => void (d.color = v))} />
      </div>
    </div>
  );
  