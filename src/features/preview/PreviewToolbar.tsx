"use client";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

export function PreviewToolbar({ host, onRefresh }: { host: string; onRefresh: () => void }) {
  return (
    <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 text-sm select-none">
      <button className="p-1" disabled>
        <ArrowLeft className="w-4 h-4 text-gray-500" />
      </button>
      <button className="p-1" disabled>
        <ArrowRight className="w-4 h-4 text-gray-500" />
      </button>
      <div className="flex-1 text-center text-gray-600">{host}</div>
      <button className="p-1" onClick={onRefresh} title="Refresh Preview">
        <RefreshCw className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}