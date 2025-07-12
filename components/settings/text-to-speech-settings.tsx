import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TextToSpeechSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Text-to-Speech</h2>
        <p className="text-muted-foreground mb-6">
          Configure voice selection, speech rate, and test your settings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>
            Choose voice, speed, and test your TTS configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              TTS configuration will be implemented here.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 