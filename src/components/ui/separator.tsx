import React from "react"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Separator = ({ className = "", ...props }: SeparatorProps) => {
  return (
    <div
      className={`border-t border-gray-200 ${className}`}
      {...props}
    />
  )
} 