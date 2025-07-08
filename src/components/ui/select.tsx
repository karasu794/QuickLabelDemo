import React, { useState, useRef, useEffect } from "react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
  onSelect?: (value: string) => void
  selectedValue?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
  isSelected?: boolean
}

interface SelectValueProps {
  placeholder?: string
}

export const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue)
    setIsOpen(false)
  }

  // Find the selected item's display text
  const getSelectedDisplayText = () => {
    const contentChild = React.Children.toArray(children).find(child => 
      React.isValidElement(child) && child.type === SelectContent
    )
    
    if (React.isValidElement(contentChild)) {
      const selectedItem = React.Children.toArray((contentChild.props as any).children).find((item: any) => 
        React.isValidElement(item) && item.type === SelectItem && (item.props as any).value === value
      )
      
      if (React.isValidElement(selectedItem)) {
        return (selectedItem.props as any).children
      }
    }
    
    return null
  }

  return (
    <div ref={selectRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child as React.ReactElement<SelectTriggerProps>, {
              onClick: () => setIsOpen(!isOpen),
              children: React.Children.map((child.props as any).children, (triggerChild) => {
                if (React.isValidElement(triggerChild) && triggerChild.type === SelectValue) {
                  return getSelectedDisplayText() || triggerChild
                }
                return triggerChild
              })
            })
          }
          if (child.type === SelectContent) {
            return isOpen ? React.cloneElement(child as React.ReactElement<SelectContentProps>, {
              onSelect: handleSelect,
              selectedValue: value
            }) : null
          }
        }
        return child
      })}
    </div>
  )
}

export const SelectTrigger = ({ className = "", children, ...props }: SelectTriggerProps) => {
  return (
    <div
      className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const SelectContent = ({ children, onSelect, selectedValue }: SelectContentProps) => {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-md">
      <div className="max-h-60 overflow-auto py-1">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === SelectItem) {
            return React.cloneElement(child as React.ReactElement<SelectItemProps>, {
              onSelect,
              isSelected: (child.props as any).value === selectedValue
            })
          }
          return child
        })}
      </div>
    </div>
  )
}

export const SelectItem = ({ value, children, onSelect, isSelected }: SelectItemProps) => {
  return (
    <div
      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-600' : ''}`}
      onClick={() => onSelect?.(value)}
    >
      {children}
    </div>
  )
}

export const SelectValue = ({ placeholder }: SelectValueProps) => {
  return <span className="text-gray-500">{placeholder}</span>
} 