"use client"

import * as React from "react"
import { toast } from "sonner"

export function useVoice(
  setCurrentMessage: (message: string) => void,
) {
  const [isRecording, setIsRecording] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isWaiting, setIsWaiting] = React.useState(false) // New state for waiting
  const [recordingMetrics, setRecordingMetrics] = React.useState<{
    max_amplitude?: number
    mean_amplitude?: number
    duration?: number
  } | null>(null)
  const wsRef = React.useRef<WebSocket | null>(null)

  const playPingSound = () => {
    // Create a simple ping sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800 // High pitch ping
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const handleVoiceInput = async () => {
    setRecordingMetrics(null)

    if (isRecording) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("stop")
      }
      setIsRecording(false)
      setIsProcessing(true)
    } else {
      // Request microphone permission first
      try {
        // Check if we need to request permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        }
      } catch (error) {
        console.error("Microphone permission denied:", error)
        toast.error("Microphone access denied. Please allow microphone access to use voice input.", {
          duration: 5000,
        })
        return
      }

      // Start waiting state immediately when button is clicked
      setIsWaiting(true)
      
      // Use the current host for WebSocket connection to work with proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'development' ? 'localhost:11434' : window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws/record`)

      ws.onopen = () => {
        // WebSocket is open, now play ping and start recording
        setIsWaiting(false)
        
        // Play ping sound to indicate recording is ready
        try {
          playPingSound()
        } catch (error) {
          console.warn("Could not play ping sound:", error)
        }
        
        // Small delay after ping to ensure user hears it
        setTimeout(() => {
          setIsRecording(true)
        }, 150) // 150ms delay after ping sound
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.status) {
          case "recording":
            setIsRecording(true)
            setIsProcessing(false)
            setIsWaiting(false)
            break
          case "processing":
            setIsRecording(false)
            setIsProcessing(true)
            setIsWaiting(false)
            if (data.metrics) {
              setRecordingMetrics(data.metrics)
            }
            break
          case "success":
            setIsRecording(false)
            setIsProcessing(false)
            setIsWaiting(false)
            if (data.transcription) {
              setCurrentMessage(data.transcription)
            }
            break
          case "error":
            setIsRecording(false)
            setIsProcessing(false)
            setIsWaiting(false)
            toast.error(data.message, {
              duration: 10000,
            })
            break
        }
      }

      ws.onerror = (error) => {
        toast.error("Connection error", {
          duration: 5000,
        })
        setIsRecording(false)
        setIsProcessing(false)
        setIsWaiting(false)
      }

      ws.onclose = () => {
        setIsRecording(false)
        setIsProcessing(false)
        setIsWaiting(false)
      }

      wsRef.current = ws
    }
  }

  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    isRecording,
    isProcessing,
    isWaiting,
    recordingMetrics,
    handleVoiceInput,
  }
} 