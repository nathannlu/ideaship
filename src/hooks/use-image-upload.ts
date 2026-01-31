"use client"

import { useState, useCallback } from "react"

interface ImageUploadOptions {
  /**
   * Maximum file size in bytes before compression is applied
   * If not provided, no compression will be performed
   */
  maxFileSize?: number
  /**
   * Callback function when an error occurs
   */
  onError?: (error: string) => void
  /**
   * Callback function when upload completes successfully
   */
  onSuccess?: (url: string) => void
  /**
   * Quality level for compression (0 to 1)
   * Lower values = smaller file size but lower quality
   * Only used when compression is needed
   */
  quality?: number
  /**
   * The bucket to upload to (defaults to env variable)
   */
  bucket?: string
  /**
   * The folder path within the bucket
   */
  folderPath?: string
}

export function useImageUpload({
  maxFileSize,
  onError = () => {},
  onSuccess = () => {},
  quality = 0.8,
  bucket,
  folderPath = "editor",
}: ImageUploadOptions = {}) {
  const [isDragActive, setIsDragActive] = useState<boolean>(false)
  const [imageData, setImageData] = useState<string | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [file, setFile] = useState<File | null>(null)

  // Compress an image using canvas
  const compressImage = useCallback(
    async (imageFile: File): Promise<File> => {
      // If no maxFileSize or file is already smaller, return original
      if (!maxFileSize || imageFile.size <= maxFileSize) {
        return imageFile
      }

      try {
        // Dynamically import browser-image-compression only when needed
        const browserImageCompression = await import("browser-image-compression").then(
          (module) => module.default
        )

        const options = {
          maxSizeMB: maxFileSize / (1024 * 1024), // Convert bytes to MB
          maxWidthOrHeight: 1920, // Limit dimensions
          useWebWorker: true,
          initialQuality: quality,
        }

        const compressedFile = await browserImageCompression(imageFile, options)
        return compressedFile
      } catch (error) {
        console.error("Image compression failed:", error)
        // Fall back to original file if compression fails
        return imageFile
      }
    },
    [maxFileSize, quality]
  )

  // Generate a unique key for the file
  const generateKey = useCallback((fileName: string): string => {
    const cleanedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, "-").toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    return `${folderPath ? folderPath + "/" : ""}${timestamp}-${randomString}-${cleanedFileName}`
  }, [folderPath])

  // Get presigned URL from server-side endpoint
  const getPresignedUrl = useCallback(async (file: File): Promise<{ url: string, publicUrl: string }> => {
    const formData = new FormData()
    formData.append("filename", file.name)
    formData.append("contentType", file.type)
    formData.append("key", `${folderPath ? folderPath + "/" : ""}${generateKey(file.name)}`)

    try {
      const response = await fetch("/api/upload/presigned-url", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        url: data.url,
        publicUrl: data.publicUrl
      }
    } catch (error) {
      console.error("Failed to generate presigned URL:", error)
      throw new Error("Failed to generate upload URL")
    }
  }, [folderPath, generateKey])

  // Upload using presigned URL
  const uploadToS3 = useCallback(async (file: File, presignedUrl: string, publicUrl: string): Promise<string> => {
    try {
      // Use fetch instead of XMLHttpRequest for simpler implementation
      const response = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          // Don't set additional headers - they're already in the presigned URL
        },
        body: file,
      });
      
      if (!response.ok) {
        console.error("Upload response:", response.status, response.statusText);
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      return publicUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error("Failed to upload image");
    }
  }, [])

  // Process the file upload
  const processFile = useCallback(async (selectedFile: File) => {
    try {
      setUploading(true)
      setProgress(0)
      
      // Read file to display preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === "string") {
          setImageData(result)
        }
      }
      reader.readAsDataURL(selectedFile)
      
      // Compress if needed
      const processedFile = await compressImage(selectedFile)
      
      // Get presigned URL and upload
      const { url: presignedUrl, publicUrl } = await getPresignedUrl(processedFile)
      const uploadedUrl = await uploadToS3(processedFile, presignedUrl, publicUrl)
      
      onSuccess(uploadedUrl)
      setUploading(false)
      setProgress(100)
      return uploadedUrl
    } catch (error) {
      console.error("Upload process failed:", error)
      onError(error instanceof Error ? error.message : "Upload failed")
      setUploading(false)
      setProgress(0)
      return null
    }
  }, [compressImage, getPresignedUrl, uploadToS3, onSuccess, onError])

  // Reset the uploader state
  const resetImage = useCallback(() => {
    setImageData(null)
    setFile(null)
    setProgress(0)
  }, [])

  return {
    isDragActive,
    imageData,
    uploading,
    progress,
    file,
    resetImage,
    uploadImage: processFile
  }
}