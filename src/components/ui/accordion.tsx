import React, { useState } from "react"

interface AccordionProps {
  type?: "single" | "multiple"
  collapsible?: boolean
  className?: string
  children: React.ReactNode
}

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
  isOpen?: boolean
  onToggle?: () => void
}

interface AccordionTriggerProps {
  className?: string
  children: React.ReactNode
  onClick?: () => void
  isOpen?: boolean
}

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
}

export const Accordion = ({ type = "single", collapsible = false, className = "", children }: AccordionProps) => {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (value: string) => {
    if (type === "single") {
      setOpenItems(prev => 
        prev.includes(value) && collapsible ? [] : [value]
      )
    } else {
      setOpenItems(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value)
          : [...prev, value]
      )
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === AccordionItem) {
          return React.cloneElement(child as React.ReactElement<AccordionItemProps>, {
            isOpen: openItems.includes((child.props as any).value),
            onToggle: () => toggleItem((child.props as any).value)
          })
        }
        return child
      })}
    </div>
  )
}

export const AccordionItem = ({ value, className = "", children, isOpen, onToggle }: AccordionItemProps) => {
  return (
    <div className={`border rounded-lg ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === AccordionTrigger) {
            return React.cloneElement(child as React.ReactElement<AccordionTriggerProps>, {
              onClick: onToggle,
              isOpen
            })
          }
          if (child.type === AccordionContent) {
            return isOpen ? child : null
          }
        }
        return child
      })}
    </div>
  )
}

export const AccordionTrigger = ({ className = "", children, onClick, isOpen }: AccordionTriggerProps) => {
  return (
    <button
      className={`flex w-full items-center justify-between p-4 text-left font-medium hover:bg-gray-50 ${className}`}
      onClick={onClick}
    >
      {children}
      <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
        ▼
      </span>
    </button>
  )
}

export const AccordionContent = ({ className = "", children }: AccordionContentProps) => {
  return (
    <div className={`pb-4 px-4 ${className}`}>
      {children}
    </div>
  )
} 