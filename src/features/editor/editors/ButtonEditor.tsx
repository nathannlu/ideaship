import type { DraftState } from "../useEditingPanel";
import { ColorPicker } from "@/components/ui/color-picker";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import React from "react";

export interface ButtonEditorProps {
  draft: DraftState;
  updateDraft: (fn: (d: DraftState) => void) => void;
  navigateToLink?: () => void;
}

export const ButtonEditor: React.FC<ButtonEditorProps> = ({ draft, updateDraft, navigateToLink }) => {
  const { text, bg, color, linkUrl, wantLink, isWrapped } = draft;
  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="w-full h-20 border p-2 rounded-md"
        value={text}
        onChange={(e) => updateDraft((d) => { d.text = e.target.value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorPicker
          label="Background"
          value={bg}
          onChange={(v) => updateDraft((d) => void (d.bg = v))}
        />
        <ColorPicker
          label="Text"
          value={color}
          onChange={(v) => updateDraft((d) => void (d.color = v))}
        />
      </div>

      <div className="flex flex-col gap-2 p-3 border rounded-md bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Button Link</span>
          <Switch
            checked={wantLink}
            onCheckedChange={(v) => updateDraft((d) => void (d.wantLink = v))}
          />
        </div>

        {wantLink && (
          <input
            className="border rounded p-1 mt-2 w-full"
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => updateDraft((d) => void (d.linkUrl = e.target.value))}
            required
          />
        )}

        {isWrapped && navigateToLink && (
          <div className="flex justify-end mt-2">
            <Button variant="default" onClick={navigateToLink}>
              Go to Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};