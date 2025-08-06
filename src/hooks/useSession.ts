import { useState, useEffect } from 'react'

// Simple session management for vote tracking
export function useUserSession(): string {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      let storedSessionId = localStorage.getItem('user_session')
      
      if (!storedSessionId) {
        // Simple session ID generation
        storedSessionId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
        localStorage.setItem('user_session', storedSessionId)
      }
      
      setSessionId(storedSessionId)
    }
  }, [])

  return sessionId
}

// Legacy function for backward compatibility
export function getUserSession(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('user_session')
  if (!sessionId) {
    sessionId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('user_session', sessionId)
  }
  return sessionId
}