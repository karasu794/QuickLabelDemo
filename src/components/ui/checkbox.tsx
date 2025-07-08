import React from "react"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onCheckedChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = ({ className = "", checked, onCheckedChange, ...props }: CheckboxProps) => {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
} 