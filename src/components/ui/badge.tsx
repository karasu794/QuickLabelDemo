import React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive"
  children: React.ReactNode
}

export const Badge = ({ variant = "default", className = "", children, ...props }: BadgeProps) => {
  const variants = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800", 
    destructive: "bg-red-100 text-red-800"
  }
  
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
} 