"use client";

import React, { useRef } from "react";

export interface ImageUploaderProps {
  onUpload: (file: File) => void;
  className?: string;
}

/**
 * Component for uploading images. Displays a button that opens file picker.
 */
const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, className }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button onClick={() => inputRef.current?.click()}>
        Upload Image
      </button>
    </div>
  );
};

export default ImageUploader;