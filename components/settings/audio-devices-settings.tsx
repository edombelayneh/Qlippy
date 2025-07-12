"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Volume2, VolumeX, Mic, MicOff } from "lucide-react"

export function AudioDevicesSettings() {
  const [speakerVolume, setSpeakerVolume] = React.useState([75])
  const [micVolume, setMicVolume] = React.useState([80])
  const [outputLevel, setOutputLevel] = React.useState(0)
  const [inputLevel, setInputLevel] = React.useState(0)
  const [isTestingSpeaker, setIsTestingSpeaker] = React.useState(false)
  const [isTestingMic, setIsTestingMic] = React.useState(false)
  const [separateRingtone, setSeparateRingtone] = React.useState(false)
  const [autoAdjustMic, setAutoAdjustMic] = React.useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = React.useState("built-in")
  const [selectedMicrophone, setSelectedMicrophone] = React.useState("built-in")

  // Mock audio devices
  const speakerDevices = [
    { id: "built-in", name: "Built-in Output (Internal Speakers)" },
    { id: "headphones", name: "External Headphones" },
    { id: "bluetooth", name: "AirPods Pro" },
    { id: "usb", name: "USB Audio Device" }
  ]

  const microphoneDevices = [
    { id: "built-in", name: "Built-in Microphone (Internal Microphone)" },
    { id: "headset", name: "Headset Microphone" },
    { id: "bluetooth", name: "AirPods Pro Microphone" },
    { id: "usb", name: "USB Microphone" }
  ]

  // Simulate audio level meters
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (isTestingSpeaker) {
        setOutputLevel(Math.random() * 100)
      } else {
        setOutputLevel(0)
      }
      
      if (isTestingMic) {
        setInputLevel(Math.random() * 100)
      } else {
        setInputLevel(Math.random() * 20) // Ambient noise level
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isTestingSpeaker, isTestingMic])

  const handleTestSpeaker = () => {
    setIsTestingSpeaker(!isTestingSpeaker)
    // In a real app, this would play a test sound
    if (!isTestingSpeaker) {
      setTimeout(() => setIsTestingSpeaker(false), 3000) // Auto-stop after 3 seconds
    }
  }

  const handleTestMic = () => {
    setIsTestingMic(!isTestingMic)
    // In a real app, this would start/stop mic recording
    if (!isTestingMic) {
      setTimeout(() => setIsTestingMic(false), 5000) // Auto-stop after 5 seconds
    }
  }

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
            className={`w-1 h-4 rounded-sm transition-colors ${
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
                {isTestingSpeaker ? "Stop Test" : "Test Speaker"}
              </Button>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {speakerDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {microphoneDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
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

          </CardContent>
        </Card>
      </div>
    </div>
  )
} 