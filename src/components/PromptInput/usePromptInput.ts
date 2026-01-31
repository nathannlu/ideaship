"use client"

import { useState } from "react"
import { useImageUpload as useS3ImageUpload } from "@/hooks/use-image-upload"

export function useImageUpload(onError: (error: string) => void) {
  const [isDragActive, setIsDragActive] = useState<boolean>(false)
  const [imageData, setImageData] = useState<string | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [file, setFile] = useState<File | null>(null)
  const { uploadImage } = useS3ImageUpload({ 
    maxFileSize: 1 * 1024 * 1024, // 1MB
    folderPath: 'editor',
    onError
   })

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragLeave = () => {
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragActive(false)

    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped)
      setUploading(true)
      const reader = new FileReader()

      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setImageData(result)
        } else {
          onError('Failed to read image')
        }
        setUploading(false)
      }

      reader.onerror = () => {
        onError('Failed to read image')
        setUploading(false)
      }

      reader.readAsDataURL(dropped)
    }
  }

  const resetImage = () => {
    setImageData(null)
    setFile(null)
  }
  // Handle file selection via input
  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type.startsWith('image/')) {
      setFile(selected)
      setUploading(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setImageData(result)
        } else {
          onError('Failed to read image')
        }
        setUploading(false)
      }
      reader.onerror = () => {
        onError('Failed to read image')
        setUploading(false)
      }
      reader.readAsDataURL(selected)
    }
  }

  return {
    isDragActive,
    imageData,
    uploading,
    file,
    handlers: {
      handleDragEnter,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleSelect
    },
    resetImage,
    uploadImage
  }
}