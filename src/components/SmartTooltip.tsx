'use client'

import { useEffect, useRef, useState } from 'react'

interface SmartTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  isVisible: boolean
}

interface TooltipPosition {
  position: 'top' | 'bottom' | 'left' | 'right'
  alignment: 'start' | 'center' | 'end'
}

export default function SmartTooltip({ children, content, isVisible }: SmartTooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    position: 'top',
    alignment: 'center'
  })

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return

    const trigger = triggerRef.current
    const tooltip = tooltipRef.current
    
    // Get trigger element dimensions and position
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Calculate available space in each direction
    const spaceTop = triggerRect.top
    const spaceBottom = viewportHeight - triggerRect.bottom
    const spaceLeft = triggerRect.left
    const spaceRight = viewportWidth - triggerRect.right
    
    // Determine best position (priority: top, bottom, right, left)
    let position: 'top' | 'bottom' | 'left' | 'right' = 'top'
    
    if (spaceTop >= tooltipRect.height + 10) {
      position = 'top'
    } else if (spaceBottom >= tooltipRect.height + 10) {
      position = 'bottom'
    } else if (spaceRight >= tooltipRect.width + 10) {
      position = 'right'
    } else if (spaceLeft >= tooltipRect.width + 10) {
      position = 'left'
    } else {
      // If no space fits perfectly, use the side with most space
      const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight)
      if (maxSpace === spaceTop) position = 'top'
      else if (maxSpace === spaceBottom) position = 'bottom'
      else if (maxSpace === spaceRight) position = 'right'
      else position = 'left'
    }
    
    // Determine alignment based on position
    let alignment: 'start' | 'center' | 'end' = 'center'
    
    if (position === 'top' || position === 'bottom') {
      // For top/bottom, check horizontal alignment
      const triggerCenter = triggerRect.left + triggerRect.width / 2
      const tooltipHalfWidth = tooltipRect.width / 2
      
      if (triggerCenter - tooltipHalfWidth < 10) {
        alignment = 'start' // Align to left
      } else if (triggerCenter + tooltipHalfWidth > viewportWidth - 10) {
        alignment = 'end' // Align to right
      } else {
        alignment = 'center' // Center align
      }
    } else {
      // For left/right, check vertical alignment
      const triggerCenter = triggerRect.top + triggerRect.height / 2
      const tooltipHalfHeight = tooltipRect.height / 2
      
      if (triggerCenter - tooltipHalfHeight < 10) {
        alignment = 'start' // Align to top
      } else if (triggerCenter + tooltipHalfHeight > viewportHeight - 10) {
        alignment = 'end' // Align to bottom
      } else {
        alignment = 'center' // Center align
      }
    }
    
    setTooltipPosition({ position, alignment })
  }, [isVisible])

  const getTooltipClasses = () => {
    const { position, alignment } = tooltipPosition
    
    let positionClasses = ''
    let arrowClasses = ''
    
    switch (position) {
      case 'top':
        positionClasses = 'bottom-full mb-2'
        arrowClasses = 'absolute top-full border-4 border-transparent border-t-gray-900'
        break
      case 'bottom':
        positionClasses = 'top-full mt-2'
        arrowClasses = 'absolute bottom-full border-4 border-transparent border-b-gray-900'
        break
      case 'left':
        positionClasses = 'right-full mr-2'
        arrowClasses = 'absolute left-full border-4 border-transparent border-l-gray-900'
        break
      case 'right':
        positionClasses = 'left-full ml-2'
        arrowClasses = 'absolute right-full border-4 border-transparent border-r-gray-900'
        break
    }
    
    let alignmentClasses = ''
    let arrowAlignmentClasses = ''
    
    if (position === 'top' || position === 'bottom') {
      switch (alignment) {
        case 'start':
          alignmentClasses = 'left-0'
          arrowAlignmentClasses = 'left-4'
          break
        case 'center':
          alignmentClasses = 'left-1/2 transform -translate-x-1/2'
          arrowAlignmentClasses = 'left-1/2 transform -translate-x-1/2'
          break
        case 'end':
          alignmentClasses = 'right-0'
          arrowAlignmentClasses = 'right-4'
          break
      }
    } else {
      switch (alignment) {
        case 'start':
          alignmentClasses = 'top-0'
          arrowAlignmentClasses = 'top-4'
          break
        case 'center':
          alignmentClasses = 'top-1/2 transform -translate-y-1/2'
          arrowAlignmentClasses = 'top-1/2 transform -translate-y-1/2'
          break
        case 'end':
          alignmentClasses = 'bottom-0'
          arrowAlignmentClasses = 'bottom-4'
          break
      }
    }
    
    return {
      tooltipClasses: `absolute z-50 ${positionClasses} ${alignmentClasses}`,
      arrowClasses: `${arrowClasses} ${arrowAlignmentClasses}`
    }
  }

  const { tooltipClasses, arrowClasses } = getTooltipClasses()

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`${tooltipClasses} px-3 py-2 bg-gray-900 text-white text-sm rounded-lg border border-gray-700 shadow-lg min-w-[200px] max-w-sm`}
          style={{ wordWrap: 'break-word' }}
        >
          {content}
          <div className={arrowClasses}></div>
        </div>
      )}
    </div>
  )
}