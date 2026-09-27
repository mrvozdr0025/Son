"use client"

import { getLevelTier } from "@/lib/level-tiers"
import { Sparkles, Shield, Award, Crown, Zap, Cpu, Compass, BookOpen, MapPin, Brain } from "lucide-react"

const ICONS: Record<string, any> = {
  Sparkles,
  BookOpen,
  Compass,
  MapPin,
  Shield,
  Award,
  Cpu,
  Brain,
  Crown,
  Zap,
}

export function LevelBadge({
  level,
  xp,
  showTitle = true,
  size = "sm",
  className = "",
}: {
  level: number
  xp?: number
  showTitle?: boolean
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}) {
  const tier = getLevelTier(level)
  const IconComponent = ICONS[tier.icon] ?? Sparkles

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3.5 py-1.5 gap-2",
  }[size]

  const iconSizes = {
    xs: "size-2.5",
    sm: "size-3",
    md: "size-3.5",
    lg: "size-4",
  }[size]

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-all select-none shadow-xs ${sizeClasses} ${className}`}
      style={{
        color: tier.badgeColor,
        borderColor: `${tier.badgeColor}40`,
        backgroundColor: tier.bgGlow,
      }}
      title={`Seviye ${tier.level}: ${tier.title} (${tier.minXp} - ${tier.maxXp === 999999 ? "∞" : tier.maxXp} XP)`}
    >
      <IconComponent className={`${iconSizes} shrink-0`} style={{ color: tier.badgeColor }} />
      <span className="font-mono font-semibold">Sv.{tier.level}</span>
      {showTitle && <span className="opacity-90">{tier.title}</span>}
    </span>
  )
}
