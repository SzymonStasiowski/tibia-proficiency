'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-800 text-gray-100 border-gray-700',
        secondary: 'bg-gray-700 text-gray-100 border-gray-600',
        outline: 'text-gray-100 border-gray-600',
        success: 'bg-green-600/20 text-green-300 border-green-700',
        warning: 'bg-yellow-600/20 text-yellow-300 border-yellow-700',
        destructive: 'bg-red-600/20 text-red-300 border-red-700'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}


