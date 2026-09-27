import {
  Brain,
  Cpu,
  Eye,
  Gamepad2,
  GraduationCap,
  Hash,
  Heart,
  Laugh,
  Newspaper,
  Rocket,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  cpu: Cpu,
  "gamepad-2": Gamepad2,
  trophy: Trophy,
  newspaper: Newspaper,
  heart: Heart,
  "graduation-cap": GraduationCap,
  "trending-up": TrendingUp,
  rocket: Rocket,
  laugh: Laugh,
  eye: Eye,
}

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Hash
  return <Icon className={className} aria-hidden="true" />
}
