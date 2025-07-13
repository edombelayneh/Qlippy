"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Globe } from "lucide-react"

const languages = [
  {
    name: "English",
    code: "en",
    flag: "🇺🇸",
    description: "English (US)"
  },
  {
    name: "Español",
    code: "es",
    flag: "🇪🇸",
    description: "Spanish"
  },
  {
    name: "Français",
    code: "fr",
    flag: "🇫🇷",
    description: "French"
  },
  {
    name: "Deutsch",
    code: "de",
    flag: "🇩🇪",
    description: "German"
  },
  {
    name: "Italiano",
    code: "it",
    flag: "🇮🇹",
    description: "Italian"
  },
  {
    name: "Português",
    code: "pt",
    flag: "🇵🇹",
    description: "Portuguese"
  },
  {
    name: "日本語",
    code: "ja",
    flag: "🇯🇵",
    description: "Japanese"
  },
  {
    name: "한국어",
    code: "ko",
    flag: "🇰🇷",
    description: "Korean"
  },
  {
    name: "中文",
    code: "zh",
    flag: "🇨🇳",
    description: "Chinese (Simplified)"
  }
]

export function LanguageSelector() {
  const [selectedLanguage, setSelectedLanguage] = React.useState("en")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {languages.map((language) => {
          const isActive = selectedLanguage === language.code
          
          return (
            <Card
              key={language.code}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                isActive 
                  ? "ring-2 ring-primary ring-offset-2" 
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedLanguage(language.code)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{language.flag}</div>
                  <div className="flex-1">
                    <div className="font-medium">{language.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {language.description}
                    </div>
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Current language: <span className="font-medium">{languages.find(l => l.code === selectedLanguage)?.name}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {/* TODO: Implement language change */}}
        >
          Apply Changes
        </Button>
      </div>
    </div>
  )
} 