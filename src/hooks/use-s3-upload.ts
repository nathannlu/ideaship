"use client"

import { useState, useCallback } from "react"

interface S3UploadOptions {
  /**
   * API endpoint for generating a presigned URL
   */
  presignedUrlEndpoint: string
  /**
   * Optional headers to include in the API request
   */
  headers?: Record<string, string>
  /**
   * The folder path within the bucket
   */
  folderPath?: string
  /**
   * Callback function when an error occurs
   */
  onError?: (error: string) => void
  /**
   * Callback function when upload completes successfully
   */
  onSuccess?: (url: string) => void
}

/**
 * Hook for uploading any type of file to S3 using a server-generated presigned URL
 */
export function useS3Upload({
  presignedUrlEndpoint,
  headers = {},
  folderPath = "",
  onError = () => {},
  onSuccess = () => {},
}: S3UploadOptions) {
  const [uploading, setUploading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)

  // Generate a unique key for the file
  const generateKey = useCallback((fileName: string): string => {
    const cleanedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, "-").toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    return `${folderPath ? folderPath + "/" : ""}${timestamp}-${randomString}-${cleanedFileName}`
  }, [folderPath])

  // Get presigned URL from server
  const getPresignedUrl = useCallback(async (file: File): Promise<{ url: string, publicUrl: string }> => {
    const formData = new FormData()
    formData.append("filename", file.name)
    formData.append("contentType", file.type)
    formData.append("key", generateKey(file.name))

    try {
      const response = await fetch(presignedUrlEndpoint, {
        method: "POST",
        headers: {
          ...headers,
        },
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
  }, [presignedUrlEndpoint, headers, generateKey])

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
      throw new Error("Failed to upload file");
    }
  }, [])

  // Upload a file
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      setProgress(0)
      
      // Get presigned URL and upload
      const { url: presignedUrl, publicUrl } = await getPresignedUrl(file)
      const uploadedUrl = await uploadToS3(file, presignedUrl, publicUrl)
      
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
  }, [getPresignedUrl, uploadToS3, onSuccess, onError])

  return {
    uploadFile,
    uploading,
    progress,
    setProgress
  }
}