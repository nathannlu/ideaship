"use client"

import { useState, createContext, useContext, ReactNode } from 'react';
import { scaffold } from "@/scaffold.generated"
import { formatFile, sortFilesByImportance } from "./codebase_utils";
import { addIdsToFiles } from "./dom_ids";

interface FileManagerContextType {
  files: Record<string, string>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isFileSystemSafe: () => boolean;
  extractCodebase: (maxFiles?: number) => string;
  createFilesBulk: (files: Record<string, string>) => Record<string, string>;
  resetFilesToDefault: () => void;
}

const FileManagerContext = createContext<FileManagerContextType>({} as FileManagerContextType)

export const useFileManager = () => {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error('useFileManager must be used within a FileManagerProvider');
  }
  return context;
};

const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 300;
const MAX_FILE_SIZE = 100 * 1024; // 100 KB

interface FileManagerProviderProps {
  children: ReactNode;
}

// This is our global state for managing files in our virtual FS
export const FileManagerProvider = ({ children }: FileManagerProviderProps) => {
  const [files, setFiles] = useState<Record<string, string>>(scaffold); 

  // Important to note the 'files' object is limited to
  // the user's browser RAM limits.
  //
  // ideally this stays under 10MB (~200-300 files)

  // maybe move this to files utils
  const isFileSystemSafe = (): boolean => {
    const totalSize = Object.values(files).reduce((acc, content) => acc + content.length, 0);
    console.log('totalSize in MB:', totalSize / (1024 * 1024));
    console.log('totalSize in bytes:', totalSize);

    return Object.keys(files).length <= MAX_FILE_COUNT && totalSize <= MAX_TOTAL_SIZE;
  }

  const extractCodebase = (maxFiles = 30): string => {
    let output = ""
    const filePaths = Object.keys(files);

    // skip filepaths that are larger than 10kb
    const filteredFilePaths = filePaths.filter(fp => {
      const content = files[fp];
      return content.length <= MAX_FILE_SIZE;
    });

    const sortedFilePaths = sortFilesByImportance(filteredFilePaths, '/')

    for (const fp of sortedFilePaths) {
      const fileContent = files[fp];
      output += formatFile(fp, '/', fileContent);
    }

    return output;
  }

  const _normalizeFiles = (files: Record<string, string>) => {
    // Normalize file paths to start with "/"
    const normalizedFiles = Object.entries(files).reduce((acc, [key, value]) => {
      const normalizedKey = key.startsWith('/') ? key : `/${key}`;
      acc[normalizedKey] = value;
      return acc;
    }, {} as Record<string, string>);

    return normalizedFiles;
  }

  const createFilesBulk = (filesFromLLM: Record<string, string>) => {
    // our vfs starts with a leading /,
    // so we normalize keys to start with "/"
    const newFiles = { ...files, ...filesFromLLM };

    // Check if the new files exceed the limits
    const totalSize = Object.values(newFiles).reduce((acc, content) => acc + content.length, 0);
    const fileCount = Object.keys(newFiles).length;

    if (fileCount > MAX_FILE_COUNT || totalSize > MAX_TOTAL_SIZE) {
      throw new Error('File limit exceeded');
    }

    // Add the "/" prefix to filepaths,
    // and tag with IDs if it doesn't exist
    const normalizedFiles = _normalizeFiles(newFiles);
    const filesWithIDs = addIdsToFiles(normalizedFiles);

    setFiles(filesWithIDs);

    return filesWithIDs;
  };

  const resetFilesToDefault = () => {
    // Reset files to the default scaffold
    setFiles(scaffold);
  }

  return (
    <FileManagerContext.Provider value={{
      files,
      setFiles,
      isFileSystemSafe,
      extractCodebase,
      createFilesBulk,
      resetFilesToDefault
    }}>
      {children}
    </FileManagerContext.Provider>
  );
};




