"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: "sm" | "default"
}

function Switch({
  className,
  size = "default",
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  onClick,
  ...props
}: SwitchProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
  const isControlled = controlledChecked !== undefined
  const isChecked = isControlled ? controlledChecked : uncontrolledChecked

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const next = !isChecked
    if (!isControlled) {
      setUncontrolledChecked(next)
    }
    onCheckedChange?.(next)
    onClick?.(e)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      data-slot="switch"
      data-state={isChecked ? "checked" : "unchecked"}
      data-size={size}
      onClick={handleClick}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-[14px] w-[24px]" : "h-[18.4px] w-[32px]",
        isChecked ? "bg-primary" : "bg-input dark:bg-input/80",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={isChecked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform",
          size === "sm" ? "size-3" : "size-4",
          isChecked
            ? (size === "sm" ? "translate-x-[10px]" : "translate-x-[14px]")
            : "translate-x-0",
          isChecked ? "dark:bg-primary-foreground" : "dark:bg-foreground"
        )}
      />
    </button>
  )
}

export { Switch }
