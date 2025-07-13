"use client"

import * as React from "react"
import { toast } from "sonner"

export function useElectron(
  setCurrentMessage: (message: string) => void,
) {
  React.useEffect(() => {
    const handleVoiceCommand = (transcription: string) => {
      if (transcription && typeof transcription === "string") {
        setCurrentMessage(transcription)
      }
    }

    const handleRecordingError = (error: string) => {
      toast.error(error, {
        duration: 10000,
      })
    }

    const setupElectronListeners = () => {
      if (typeof window !== "undefined") {
        if (
          (window as any).electron &&
          typeof (window as any).electron.on === "function"
        ) {
          try {
            (window as any).electron.on("voice-command", handleVoiceCommand)
            (window as any).electron.on("recording-error", handleRecordingError)
            return true
          } catch (error) {
            return false
          }
        } else {
          return false
        }
      }
      return false
    }

    if (!setupElectronListeners()) {
      const retryTimeout = setTimeout(() => {
        if (!setupElectronListeners()) {
          const finalRetryTimeout = setTimeout(() => {
            if (!setupElectronListeners()) {
            }
          }, 500)

          return () => clearTimeout(finalRetryTimeout)
        }
      }, 100)

      return () => clearTimeout(retryTimeout)
    }

    return () => {
      if (
        typeof window !== "undefined" &&
        (window as any).electron &&
        typeof (window as any).electron.removeListener === "function"
      ) {
        try {
          (window as any).electron.removeListener(
            "voice-command",
            handleVoiceCommand,
          )
          (window as any).electron.removeListener(
            "recording-error",
            handleRecordingError,
          )
        } catch (error) {
        }
      }
    }
  }, [setCurrentMessage])
} 