"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Volume2, VolumeX, Mic, MicOff } from "lucide-react"
import { toast } from "sonner"
import { settingsApi } from "@/lib/api"

// Add Electron IPC helpers
const isElectron = typeof window !== 'undefined' && (window as any).electron && typeof (window as any).electron.send === 'function';

export function AudioDevicesSettings() {
  const [speakerVolume, setSpeakerVolume] = React.useState([75])
  const [micVolume, setMicVolume] = React.useState([80])
  const [outputLevel, setOutputLevel] = React.useState(0)
  const [inputLevel, setInputLevel] = React.useState(0)
  const [isTestingSpeaker, setIsTestingSpeaker] = React.useState(false)
  const [isTestingMic, setIsTestingMic] = React.useState(false)
  const [separateRingtone, setSeparateRingtone] = React.useState(false)
  const [autoAdjustMic, setAutoAdjustMic] = React.useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = React.useState("default")
  const [selectedMicrophone, setSelectedMicrophone] = React.useState("default")
  const [audioDevices, setAudioDevices] = React.useState<{
    speakers: MediaDeviceInfo[]
    microphones: MediaDeviceInfo[]
  }>({ speakers: [], microphones: [] })
  
  // For mic visualization
  const [mediaStream, setMediaStream] = React.useState<MediaStream | null>(null)
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = React.useState<AnalyserNode | null>(null)
  const animationRef = React.useRef<number>()

  // Add state for Electron device list
  const [electronInputDevices, setElectronInputDevices] = React.useState<{ index: string, label: string }[]>([])

  // Load available audio devices
  React.useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true })
        
        const devices = await navigator.mediaDevices.enumerateDevices()
        const speakers = devices.filter(device => device.kind === 'audiooutput')
        const microphones = devices.filter(device => device.kind === 'audioinput')
        
        setAudioDevices({ speakers, microphones })
        
        // Set default devices
        if (speakers.length > 0 && selectedSpeaker === "default") {
          setSelectedSpeaker(speakers[0].deviceId || "default")
        }
        if (microphones.length > 0 && selectedMicrophone === "default") {
          setSelectedMicrophone(microphones[0].deviceId || "default")
        }
      } catch (error) {
        console.error("Error loading audio devices:", error)
      }
    }
    
    loadDevices()
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
    }
  }, [selectedSpeaker, selectedMicrophone])

  // Load saved audio settings from backend
  React.useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        const data = await settingsApi.getAudio()
        if (data) {
          if (typeof data.speaker_volume === 'number') setSpeakerVolume([Math.round(data.speaker_volume * 100)])
          if (typeof data.mic_volume === 'number') setMicVolume([Math.round(data.mic_volume * 100)])
          if (data.selected_speaker) setSelectedSpeaker(data.selected_speaker)
          if (data.selected_microphone) setSelectedMicrophone(data.selected_microphone)
        }
      } catch (e) {
        // Ignore errors, fallback to defaults
      }
    }
    loadAudioSettings()
  }, [])

  // On mount, request preferences from Electron if available
  React.useEffect(() => {
    if (isElectron) {
      (window as any).electron.send('get-audio-preferences');
      const handler = (prefs: any) => {
        if (typeof prefs.speaker_volume === 'number') setSpeakerVolume([Math.round(prefs.speaker_volume * 100)]);
        if (typeof prefs.mic_volume === 'number') setMicVolume([Math.round(prefs.mic_volume * 100)]);
        if (prefs.selected_speaker) setSelectedSpeaker(prefs.selected_speaker);
        if (prefs.selected_microphone) setSelectedMicrophone(prefs.selected_microphone);
      };
      (window as any).electron.on('audio-preferences-updated', handler);
      return () => {
        (window as any).electron.removeListener('audio-preferences-updated', handler);
      };
    }
  }, []);

  // On mount, request Electron device list if available
  React.useEffect(() => {
    if (isElectron) {
      (window as any).electron.send('list-audio-input-devices');
      const handler = (devices: any[]) => {
        setElectronInputDevices(devices || []);
      };
      (window as any).electron.on('audio-input-devices-list', handler);
      return () => {
        (window as any).electron.removeListener('audio-input-devices-list', handler);
      };
    }
  }, []);

  // Listen for fallback error from Electron and show toast
  React.useEffect(() => {
    if (isElectron) {
      const handler = (msg: string) => {
        if (msg && msg.includes('Selected microphone not available')) {
          toast.warning(msg);
        }
      };
      (window as any).electron.on('recording-error', handler);
      return () => {
        (window as any).electron.removeListener('recording-error', handler);
      };
    }
  }, []);

  // Map selectedMicrophone to Electron index if available
  const effectiveSelectedMicrophone = React.useMemo(() => {
    if (!isElectron || electronInputDevices.length === 0) return selectedMicrophone;
    // If selectedMicrophone is already an index, return as is
    if (electronInputDevices.some(d => d.index === selectedMicrophone)) return selectedMicrophone;
    // Try to map by label (browser deviceId is not index, so fallback to first device)
    const fallback = electronInputDevices[0]?.index || '0';
    return fallback;
  }, [selectedMicrophone, electronInputDevices, isElectron]);

  // When preferences change, send to Electron main process
  React.useEffect(() => {
    if (isElectron) {
      (window as any).electron.send('set-audio-preferences', {
        speaker_volume: speakerVolume[0] / 100,
        mic_volume: micVolume[0] / 100,
        selected_speaker: selectedSpeaker,
        selected_microphone: effectiveSelectedMicrophone,
      });
    }
  }, [speakerVolume, micVolume, selectedSpeaker, effectiveSelectedMicrophone]);

  // Cleanup audio resources on unmount
  React.useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (audioContext) {
        audioContext.close()
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mediaStream, audioContext])

  const playPingSound = () => {
    // Create a simple ping sound using Web Audio API
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.frequency.value = 800 // High pitch ping
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3 * (speakerVolume[0] / 100), audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
    
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.1)
    
    // Cleanup
    setTimeout(() => {
      audioCtx.close()
    }, 200)
  }

  const handleTestSpeaker = () => {
    if (isTestingSpeaker) {
      setIsTestingSpeaker(false)
      return
    }

    setIsTestingSpeaker(true)
    
    // Play a sequence of pings
    playPingSound()
    setTimeout(playPingSound, 300)
    setTimeout(playPingSound, 600)
    
    // Show output level animation
    const animateOutput = () => {
      if (isTestingSpeaker) {
        setOutputLevel(Math.random() * 80 + 20)
        setTimeout(animateOutput, 100)
      } else {
        setOutputLevel(0)
      }
    }
    animateOutput()
    
    // Auto-stop after 1 second
    setTimeout(() => {
      setIsTestingSpeaker(false)
      setOutputLevel(0)
    }, 1000)
  }

  const visualizeMicInput = () => {
    if (!analyser || !audioContext) return
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const animate = () => {
      if (!isTestingMic) {
        setInputLevel(0)
        return
      }
      
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
      const normalizedLevel = (average / 255) * 100 * (micVolume[0] / 100)
      
      setInputLevel(normalizedLevel)
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
  }

  const handleTestMic = async () => {
    if (isTestingMic) {
      // Stop testing
      setIsTestingMic(false)
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
        setMediaStream(null)
      }
      
      if (audioContext) {
        audioContext.close()
        setAudioContext(null)
        setAnalyser(null)
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      setInputLevel(0)
      return
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicrophone !== "default" ? { exact: selectedMicrophone } : undefined
        }
      })
      
      setMediaStream(stream)
      setIsTestingMic(true)
      
      // Set up audio analysis
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyserNode = ctx.createAnalyser()
      
      analyserNode.fftSize = 256
      source.connect(analyserNode)
      
      setAudioContext(ctx)
      setAnalyser(analyserNode)
      
      // Start visualization
      visualizeMicInput()
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isTestingMic) {
          handleTestMic()
        }
      }, 10000)
      
    } catch (error) {
      console.error("Microphone access error:", error)
      toast.error("Microphone access denied. Please allow microphone access to test.")
      setIsTestingMic(false)
    }
  }

  // Start visualizing when analyser is ready
  React.useEffect(() => {
    if (analyser && isTestingMic) {
      visualizeMicInput()
    }
  }, [analyser, isTestingMic])

  const AudioLevelMeter = ({ level, className = "" }: { level: number; className?: string }) => (
    <div className={`flex items-center space-x-1 ${className}`}>
      {Array.from({ length: 20 }, (_, i) => {
        const threshold = (i + 1) * 5
        const isActive = level >= threshold
        const isWarning = threshold > 80
        const isDanger = threshold > 90
        
        return (
          <div
            key={i}
            className={`w-1 h-4 rounded-sm transition-all duration-100 ${
              isActive
                ? isDanger
                  ? "bg-red-500"
                  : isWarning
                  ? "bg-yellow-500"
                  : "bg-green-500"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Audio Devices</h2>
        <p className="text-muted-foreground mb-6">
          Configure your microphone input and speaker output devices.
        </p>
      </div>

      <div className="space-y-6">
        {/* Speaker Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5" />
              <span>Speaker</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Speaker Device Selection */}
            <div className="flex items-center space-x-4">
              <Button
                variant={isTestingSpeaker ? "destructive" : "outline"}
                onClick={handleTestSpeaker}
                className="shrink-0"
              >
                {isTestingSpeaker ? "Testing..." : "Test Speaker"}
              </Button>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select speaker device" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.speakers.length === 0 ? (
                    <SelectItem value="default">Default Speaker</SelectItem>
                  ) : (
                    audioDevices.speakers.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId || "default"}>
                        {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Output Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Output Volume:</span>
                <span className="text-xs text-muted-foreground">
                  {speakerVolume[0]}%
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={speakerVolume}
                  onValueChange={setSpeakerVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Output Level Meter */}
            {isTestingSpeaker && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Output Level:</span>
                <AudioLevelMeter level={outputLevel} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Microphone Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="h-5 w-5" />
              <span>Microphone</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Microphone Device Selection */}
            <div className="flex items-center space-x-4">
              <Button
                variant={isTestingMic ? "destructive" : "outline"}
                onClick={handleTestMic}
                className="shrink-0"
              >
                {isTestingMic ? "Stop Test" : "Test Mic"}
              </Button>
              <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select microphone device" />
                </SelectTrigger>
                <SelectContent>
                  {isElectron && electronInputDevices.length > 0 ? (
                    electronInputDevices.map((device) => (
                      <SelectItem key={device.index} value={device.index}>
                        {device.label || `Microphone ${device.index}`}
                      </SelectItem>
                    ))
                  ) : audioDevices.microphones.length === 0 ? (
                    <SelectItem value="default">Default Microphone</SelectItem>
                  ) : (
                    audioDevices.microphones.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId || "default"}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Input Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Input Volume:</span>
                <span className="text-xs text-muted-foreground">
                  {micVolume[0]}%
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <MicOff className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={micVolume}
                  onValueChange={setMicVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Mic className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Input Level Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Input Level:</span>
                {isTestingMic && (
                  <span className="text-xs text-muted-foreground">
                    Speak into your microphone...
                  </span>
                )}
              </div>
              <AudioLevelMeter level={inputLevel} />
            </div>

            {/* Auto-adjust option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-adjust"
                checked={autoAdjustMic}
                onCheckedChange={(checked) => setAutoAdjustMic(checked as boolean)}
              />
              <label
                htmlFor="auto-adjust"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Automatically adjust microphone sensitivity
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 