"use client"

import * as React from "react"

type PopoverContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const context = React.useMemo(() => ({ open, setOpen }), [open])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <PopoverContext.Provider value={context}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger(
  { children, asChild = false, "data-test": dataTest }: { children: React.ReactNode, asChild?: boolean, "data-test"?: string }
) {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("PopoverTrigger must be used within Popover")
  const { open, setOpen } = ctx

  const commonProps = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
    "data-test": dataTest,
    onClick: () => setOpen(!open),
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, { ...commonProps })
  }

  return (
    <button type="button" className="text-sm text-blue-600 underline" {...commonProps}>
      {children}
    </button>
  )
}

export function PopoverContent(
  { children, className = "", "data-test": dataTest }: { children: React.ReactNode, className?: string, "data-test"?: string }
) {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("PopoverContent must be used within Popover")
  const { open, setOpen } = ctx

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      className={`z-50 absolute left-0 mt-2 w-80 max-w-[32rem] rounded-md border bg-white p-4 shadow-lg focus:outline-none ${className}`}
      data-test={dataTest}
    >
      <div className="space-y-3 text-sm leading-6 text-gray-800">{children}</div>
      <div className="mt-3 text-right">
        <button
          type="button"
          className="text-sm text-gray-600 hover:text-gray-800 underline"
          onClick={() => setOpen(false)}
          aria-label="閉じる"
          data-test="popover-close"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}


