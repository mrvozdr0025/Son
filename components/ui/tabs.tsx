"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  orientation: "horizontal" | "vertical"
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
}

function Tabs({
  className,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  orientation = "horizontal",
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, setValue, orientation }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex gap-2",
          orientation === "horizontal" ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsListVariants> {}

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsListProps) {
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({
  className,
  value,
  children,
  onClick,
  ...props
}: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      data-slot="tabs-trigger"
      onClick={(e) => {
        ctx?.setValue(value)
        onClick?.(e)
      }}
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-xs font-semibold"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({
  className,
  value,
  children,
  ...props
}: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      data-state="active"
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none animate-in fade-in-50 duration-150", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
