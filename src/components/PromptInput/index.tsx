import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useImageUpload } from "./usePromptInput";
import { type Message } from "@/actions/chat-conversations";

interface PromptInputProps {
  onSendMessage?: (message: Message) => void;
  generating?: boolean;
  onError?: (error: string) => void;
  // Add Vercel AI SDK props
  input?: string;
  handleInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setInput?: (input: string) => void;
  stop?: () => void;
  height?: number;
  onAttachments?: (files: FileList) => void;
}

export function PromptInput({
  onSendMessage = () => {},
  generating = false,
  height = 38,
  onError = (err: string) => console.error(err),
  // New Vercel AI SDK props
  input,
  handleInputChange,
  setInput,
  stop,
  onAttachments
}: PromptInputProps) {
  // Only use local state when the AI SDK props aren't provided
  const { isDragActive, imageData, uploading: reading, file, handlers, resetImage, uploadImage } = useImageUpload(onError);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create a unified submission handler
  const handleSend = async () => {
    try {
      // Check if we have text or image
      const textContent = (input || "").trim();
      
      // Don't send empty messages 
      if (!textContent && !imageData) return;
      
      // Handle image uploads if present
      let imageUrl = "";
      if (imageData) {
        if (file) {
          setUploadingImage(true);
          try {
            const uploadedUrl = await uploadImage(file);
            imageUrl = uploadedUrl ?? "";
          } catch (err: any) {
            onError(err.message || "Upload failed");
            console.error(err);
            return;
          } finally {
            setUploadingImage(false);
          }
        } else {
          imageUrl = imageData;
        }
      }

      // Create the message with text and/or image
      const msg: Message = { 
        role: 'user', 
        content: { 
          text: textContent, 
          image: imageUrl 
        } 
      };
      
      // Reset input state
      if (setInput) {
        setInput('');
      }
      // Reset image
      resetImage();
      
      // Send the message via callback
      onSendMessage(msg);
    } catch (e) {
      console.log(e)
    }
  };



  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onAttachments) {
        onAttachments(e.target.files);
      } else {
        handlers.handleSelect(e);
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Don't submit empty content
        if (!input?.trim() && !imageData) {
          return;
        }
        handleSend();
      }}
      onDragEnter={(e) => handlers.handleDragEnter(e as any)}
      onDragOver={(e) => handlers.handleDragOver(e as any)}
      onDragLeave={(e) => handlers.handleDragLeave(e as any)}
      onDrop={(e) => handlers.handleDrop(e as any)}
      className={cn(
        "group flex flex-col gap-2 rounded-xl p-2 duration-125 w-full border border-neutral-700 bg-neutral-900 pb-3 text-base transition-all ease-in-out",
        "focus-within:border-foreground/20 hover:border-foreground/10 focus-within:hover:border-foreground/20"
      )}
    >
      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 bg-opacity-75 pointer-events-none rounded">
          <span className="text-gray-500">Drop image to upload</span>
        </div>
      )}
      {imageData && (
        <div className="mb-2">
          <img
            src={imageData}
            alt="Preview"
            className="max-h-20 rounded-md border"
          />
        </div>
      )}
      <div className="relative flex items-center">
        <Textarea
          id="chatinput"
          placeholder="Type your prompt..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          autoFocus
          style={{ minHeight: height, height: height }}
          className={cn(
            "flex w-full rounded-md px-2 py-2 resize-none text-[16px] leading-snug",
            "placeholder:text-muted-foreground placeholder-shown:text-ellipsis placeholder-shown:whitespace-nowrap",
            "bg-transparent border-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground"
          )}
          disabled={generating || reading || uploadingImage}
        />
      </div>

      <div className="flex gap-1 h-[27px] flex-wrap items-center pl-0.5">
        <Button
          variant="ghost"
          type="button"
          className="text-sm h-fit px-1 py-0.5 gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={reading || uploadingImage}
        >
          <Upload className="h-4 w-4 text-muted-foreground shrink-0" /> Attach
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />
        <div className="flex flex-grow items-center justify-end gap-2">
          {generating && stop && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={stop}
              className="text-xs px-2 py-1 h-6"
            >
              Stop
            </Button>
          )}
          <button
            type="submit"
            className="ml-2 w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={generating || reading || uploadingImage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}