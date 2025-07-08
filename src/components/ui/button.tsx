import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

export const Button = ({ 
  variant = "default", 
  size = "md", 
  className = "", 
  children, 
  ...props 
}: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  }
  
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  }
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
} 