"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarContextValue {
  hasImageLoaded: boolean
  setHasImageLoaded: (loaded: boolean) => void
  hasImageError: boolean
  setHasImageError: (error: boolean) => void
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null)

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "default" | "sm" | "lg"
}

function Avatar({
  className,
  size = "default",
  children,
  ...props
}: AvatarProps) {
  const [hasImageLoaded, setHasImageLoaded] = React.useState(false)
  const [hasImageError, setHasImageError] = React.useState(false)

  return (
    <AvatarContext.Provider value={{ hasImageLoaded, setHasImageLoaded, hasImageError, setHasImageError }}>
      <span
        data-slot="avatar"
        data-size={size}
        className={cn(
          "group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
          className
        )}
        {...props}
      >
        {children}
      </span>
    </AvatarContext.Provider>
  )
}

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

function AvatarImage({ className, src, alt = "", ...props }: AvatarImageProps) {
  const ctx = React.useContext(AvatarContext)
  const [error, setError] = React.useState(false)

  if (!src || error || ctx?.hasImageError) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      onLoad={() => ctx?.setHasImageLoaded(true)}
      onError={() => {
        setError(true)
        ctx?.setHasImageError(true)
      }}
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

function AvatarFallback({
  className,
  children,
  ...props
}: AvatarFallbackProps) {
  const ctx = React.useContext(AvatarContext)

  if (ctx?.hasImageLoaded && !ctx?.hasImageError) {
    return null
  }

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
