import { useCallback } from 'react'
import { toast } from 'sonner'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast() {
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    switch (type) {
      case 'success':
        return toast.success(message)
      case 'error':
        return toast.error(message)
      default:
        return toast(message)
    }
  }, [])

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])

  return {
    toasts: [],
    addToast,
    removeToast: (_id: string) => {},
    success,
    error,
    info
  }
}