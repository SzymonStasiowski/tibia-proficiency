'use client'

import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-gray-900 text-white border border-gray-700',
          description: 'text-gray-300',
          actionButton: 'bg-blue-600 hover:bg-blue-700',
          cancelButton: 'bg-gray-700 hover:bg-gray-600'
        }
      }}
    />
  )
}


