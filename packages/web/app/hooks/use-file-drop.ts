"use client"

import * as React from "react"
import { toast } from "sonner"

interface UseFileDropProps {
  onFileSelect: (file: File) => void
  fileType?: string
}

export function useFileDrop({
  onFileSelect,
  fileType = ".py",
}: UseFileDropProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const targetFile = files.find((file) => file.name.endsWith(fileType))

    if (targetFile) {
      onFileSelect(targetFile)
    } else {
      toast.error(`Please drop a ${fileType} file`)
    }
  }

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return {
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
  }
} 