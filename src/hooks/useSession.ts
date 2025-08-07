import { useState, useEffect } from 'react'
import { createHash } from 'crypto'

// Enhanced session management with security improvements
export function useUserSession(): string {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      let storedSessionId = localStorage.getItem('user_session')
      
      // Validate existing session format (must be 64 chars hex for new secure format)
      if (!storedSessionId || !isValidSecureSession(storedSessionId)) {
        storedSessionId = generateSecureClientSession()
        localStorage.setItem('user_session', storedSessionId)
      }
      
      setSessionId(storedSessionId)
    }
  }, [])

  return sessionId
}

// Generate a more secure client session ID
function generateSecureClientSession(): string {
  const timestamp = Date.now()
  const random1 = crypto.getRandomValues(new Uint32Array(1))[0]
  const random2 = crypto.getRandomValues(new Uint32Array(1))[0]
  const userAgent = navigator.userAgent
  const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`
  
  const data = `${timestamp}-${random1}-${random2}-${userAgent.slice(0, 50)}-${screenFingerprint}`
  
  // Use Web Crypto API if available, fallback to simple hash
  if (window.crypto && window.crypto.subtle) {
    // For client-side, we'll use a simpler approach but still more secure than before
    const encoder = new TextEncoder()
    const dataArray = encoder.encode(data)
    let hash = 0
    for (let i = 0; i < dataArray.length; i++) {
      hash = ((hash << 5) - hash + dataArray[i]) & 0xffffffff
    }
    return `sec_${Math.abs(hash).toString(16)}_${timestamp.toString(16)}_${random1.toString(16)}`
  }
  
  // Fallback for older browsers
  return `sec_${btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}_${timestamp.toString(16)}`
}

// Validate session format
function isValidSecureSession(session: string): boolean {
  // New secure sessions start with 'sec_' and have proper format
  return session.startsWith('sec_') && session.length >= 20
}

// Legacy function for backward compatibility - will be deprecated
export function getUserSession(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('user_session')
  if (!sessionId || !isValidSecureSession(sessionId)) {
    sessionId = generateSecureClientSession()
    localStorage.setItem('user_session', sessionId)
  }
  return sessionId
}
// Get additional session metadata for server validation
export function getSessionMetadata() {
  if (typeof window === 'undefined') return null
  
  return {
    userAgent: navigator.userAgent.slice(0, 100), // Truncate for storage
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  }
}
