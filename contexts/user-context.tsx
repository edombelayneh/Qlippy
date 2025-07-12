"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/lib/api'
import { qlippyAPI } from '@/lib/api'

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auto-create a single user on app start
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true)
        
        // Try to get existing user from localStorage
        const savedUserId = localStorage.getItem('qlippy_user_id')
        console.log('Saved user ID from localStorage:', savedUserId)
        
        if (savedUserId) {
          // Try to get the existing user
          try {
            console.log('Attempting to get existing user:', savedUserId)
            const existingUser = await qlippyAPI.getUser(savedUserId)
            console.log('Existing user found:', existingUser)
            setUser(existingUser)
            return
          } catch (err) {
            // User doesn't exist, create a new one
            console.log('Existing user not found, creating new user:', err)
          }
        }
        
        // Create a new user with a default name
        console.log('Creating new user...')
        const newUser = await qlippyAPI.createUser('Qlippy User')
        console.log('New user created:', newUser)
        setUser(newUser)
        localStorage.setItem('qlippy_user_id', newUser.id)
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize user'
        setError(errorMessage)
        console.error('Failed to initialize user:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [])

  const isAuthenticated = !!user

  const value: UserContextType = {
    user,
    loading,
    error,
    isAuthenticated,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
} 