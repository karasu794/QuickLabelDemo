import React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Card = ({ className = "", children, ...props }: CardProps) => {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ className = "", children, ...props }: CardProps) => {
  return (
    <div
      className={`p-6 pb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardTitle = ({ className = "", children, ...props }: CardProps) => {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
}

export const CardContent = ({ className = "", children, ...props }: CardProps) => {
  return (
    <div
      className={`p-6 pt-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
} 