'use client'

import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'

interface SmartTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  isVisible?: boolean
}

// Backward-compatible wrapper around new Radix-based tooltip.
export default function SmartTooltip({ children, content }: SmartTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip content={content}>
        <div className="inline-block">{children}</div>
      </Tooltip>
    </TooltipProvider>
  )
}