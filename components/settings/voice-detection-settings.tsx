import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function VoiceDetectionSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Voice Detection</h2>
        <p className="text-muted-foreground mb-6">
          Configure wake word detection and voice command settings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Wake Word Settings</CardTitle>
          <CardDescription>
            Configure "Hey Qlippy" detection and Picovoice settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Voice detection settings will be implemented here.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 