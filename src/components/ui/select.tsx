'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
NativeSelect.displayName = 'NativeSelect'


