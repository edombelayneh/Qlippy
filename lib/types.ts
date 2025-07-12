export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface Conversation {
  id:string
  title: string
  messages: Message[]
  lastUpdated: Date
  folder?: string // Optional folder tag
}

export interface Plugin {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface AIModel {
  id: string
  name: string
  description: string
}

export interface UploadedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'video' | 'audio'
}

export interface Folder {
  id: string
  name: string
  icon: string
  color: string
} 