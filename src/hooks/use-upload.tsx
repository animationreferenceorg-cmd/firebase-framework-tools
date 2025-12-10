
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {nanoid} from 'nanoid';

type UploadStatus = 'uploading' | 'success' | 'error';

interface Upload {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
}

interface UploadContextType {
  uploads: Upload[];
  startUpload: (fileName: string) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  finishUpload: (id: string, status: 'success' | 'error') => void;
  clearUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<Upload[]>([]);

  const startUpload = (fileName: string): string => {
    const id = nanoid();
    const newUpload: Upload = {
      id,
      fileName,
      progress: 0,
      status: 'uploading',
    };
    setUploads((prev) => [...prev, newUpload]);
    return id;
  };

  const updateUploadProgress = (id: string, progress: number) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, progress } : upload
      )
    );
  };

  const finishUpload = (id: string, status: 'success' | 'error') => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.id === id ? { ...upload, status, progress: status === 'success' ? 100 : upload.progress } : upload
      )
    );
    // Automatically clear after a delay
    setTimeout(() => {
        clearUpload(id);
    }, 5000);
  };
  
  const clearUpload = (id: string) => {
    setUploads((prev) => prev.filter(upload => upload.id !== id));
  }

  return (
    <UploadContext.Provider
      value={{ uploads, startUpload, updateUploadProgress, finishUpload, clearUpload }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
