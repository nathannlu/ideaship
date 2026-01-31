import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button"
import type { DraftState } from "../useEditingPanel";
import React from "react";
import { LabeledInput } from "@/components/ui/labeled-input";

export interface LinkEditorProps {
    draft: DraftState;
    updateDraft: (fn: (d: DraftState) => void) => void;
    navigateToLink?: () => void;
  }
  
  export const LinkEditor: React.FC<LinkEditorProps> = ({ draft, updateDraft, navigateToLink }) => {
    const { bg, color, text, linkUrl } = draft;
  
    return (
      <div className="flex flex-col gap-3">
        <LabeledInput
          label="URL"
          value={linkUrl}
          onChange={(e) => {
            const url = e.target.value;
            updateDraft((d) => {
              d.linkUrl = url
            });
          }}
        />
        <LabeledInput
          label="Link text"
          value={text}
          onChange={(e) => {
            const content = e.target.value;
            updateDraft((d) => {
              d.text = content 
            });
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <ColorPicker label="Background" value={bg} onChange={(v) => updateDraft((d) => void (d.bg = v))} />
          <ColorPicker label="Text" value={color} onChange={(v) => updateDraft((d) => void (d.color = v))} />
        </div>

        {navigateToLink && (
          <div className="flex justify-end mt-2">
            <Button variant="default" onClick={navigateToLink}>
              Go to Link
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  