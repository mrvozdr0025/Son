"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { CategoryIcon } from "@/components/category-icon"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Flame,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Tag,
  Hash,
  Compass,
  ArrowUpRight,
} from "lucide-react"

export interface CategoryCardData {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  topicCount: number
}

export interface CategoryTagItem {
  id: number
  name: string
  slug: string
  count: number
}

interface CategoriesPageViewProps {
  categories: CategoryCardData[]
  totalTopics: number
  categoryTagsMap?: Record<number, CategoryTagItem[]>
}

// Category visual configuration: custom palette, cover gradients, SVG patterns, and default popular sub-tags
interface CategoryTheme {
  accent: string
  secondary: string
  bgFrom: string
  bgVia: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  borderHover: string
  glowClass: string
  pattern: "neural" | "circuit" | "gaming" | "stadium" | "radar" | "aurora" | "academic" | "candlestick" | "launch" | "comic" | "vortex" | "default"
  popularTags: { name: string; slug: string }[]
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "yapay-zeka": {
    accent: "#22d3ee",
    secondary: "#06b6d4",
    bgFrom: "from-cyan-950/70",
    bgVia: "via-cyan-900/30",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    badgeBorder: "border-cyan-500/30",
    borderHover: "hover:border-cyan-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
    pattern: "neural",
    popularTags: [
      { name: "LLM", slug: "llm" },
      { name: "ChatGPT", slug: "chatgpt" },
      { name: "Claude", slug: "claude" },
      { name: "Prompting", slug: "prompting" },
      { name: "Robotik", slug: "robotik" },
      { name: "DerinÖğrenme", slug: "derin-ogrenme" },
    ],
  },
  teknoloji: {
    accent: "#38bdf8",
    secondary: "#0284c7",
    bgFrom: "from-sky-950/70",
    bgVia: "via-sky-900/30",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-400",
    badgeBorder: "border-sky-500/30",
    borderHover: "hover:border-sky-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]",
    pattern: "circuit",
    popularTags: [
      { name: "Donanım", slug: "donanim" },
      { name: "Yazılım", slug: "yazilim" },
      { name: "Apple", slug: "apple" },
      { name: "Linux", slug: "linux" },
      { name: "AkıllıTelefon", slug: "akilli-telefon" },
      { name: "İşlemci", slug: "islemci" },
    ],
  },
  oyun: {
    accent: "#4ade80",
    secondary: "#16a34a",
    bgFrom: "from-emerald-950/70",
    bgVia: "via-emerald-900/30",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    borderHover: "hover:border-emerald-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(74,222,128,0.15)]",
    pattern: "gaming",
    popularTags: [
      { name: "Steam", slug: "steam" },
      { name: "PlayStation", slug: "playstation" },
      { name: "RPGGaming", slug: "rpg-gaming" },
      { name: "Espor", slug: "espor" },
      { name: "IndieGames", slug: "indie-games" },
      { name: "FPS", slug: "fps" },
    ],
  },
  futbol: {
    accent: "#facc15",
    secondary: "#eab308",
    bgFrom: "from-amber-950/70",
    bgVia: "via-amber-900/30",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/30",
    borderHover: "hover:border-amber-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(250,204,21,0.15)]",
    pattern: "stadium",
    popularTags: [
      { name: "SüperLig", slug: "super-lig" },
      { name: "ŞampiyonlarLigi", slug: "sampiyonlar-ligi" },
      { name: "Transfer", slug: "transfer" },
      { name: "Derbi", slug: "derbi" },
      { name: "MilliTakım", slug: "milli-takim" },
      { name: "Taktik", slug: "taktik" },
    ],
  },
  gundem: {
    accent: "#f87171",
    secondary: "#dc2626",
    bgFrom: "from-rose-950/70",
    bgVia: "via-rose-900/30",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-400",
    badgeBorder: "border-rose-500/30",
    borderHover: "hover:border-rose-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(248,113,113,0.15)]",
    pattern: "radar",
    popularTags: [
      { name: "SonDakika", slug: "son-dakika" },
      { name: "Ekonomi", slug: "ekonomi" },
      { name: "Gelişmeler", slug: "gelismeler" },
      { name: "Dünya", slug: "dunya" },
      { name: "Haberler", slug: "haberler" },
      { name: "SosyalMedya", slug: "sosyal-medya" },
    ],
  },
  iliskiler: {
    accent: "#fb7185",
    secondary: "#e11d48",
    bgFrom: "from-pink-950/70",
    bgVia: "via-pink-900/30",
    badgeBg: "bg-pink-500/10",
    badgeText: "text-pink-400",
    badgeBorder: "border-pink-500/30",
    borderHover: "hover:border-pink-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(251,113,133,0.15)]",
    pattern: "aurora",
    popularTags: [
      { name: "Tavsiye", slug: "tavsiye" },
      { name: "İletişim", slug: "iletisim" },
      { name: "Evlilik", slug: "evlilik" },
      { name: "Arkadaşlık", slug: "arkadaslik" },
      { name: "Duygular", slug: "duygular" },
      { name: "Psikoloji", slug: "psikoloji" },
    ],
  },
  universite: {
    accent: "#a3e635",
    secondary: "#65a30d",
    bgFrom: "from-lime-950/70",
    bgVia: "via-lime-900/30",
    badgeBg: "bg-lime-500/10",
    badgeText: "text-lime-400",
    badgeBorder: "border-lime-500/30",
    borderHover: "hover:border-lime-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(163,230,53,0.15)]",
    pattern: "academic",
    popularTags: [
      { name: "YKS", slug: "yks" },
      { name: "Kampüs", slug: "kampus" },
      { name: "Staj", slug: "staj" },
      { name: "Kariyer", slug: "kariyer" },
      { name: "YurtHayatı", slug: "yurt-hayati" },
      { name: "VizeFinal", slug: "vize-final" },
    ],
  },
  finans: {
    accent: "#34d399",
    secondary: "#059669",
    bgFrom: "from-emerald-950/70",
    bgVia: "via-teal-900/30",
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-400",
    badgeBorder: "border-teal-500/30",
    borderHover: "hover:border-teal-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
    pattern: "candlestick",
    popularTags: [
      { name: "Borsa", slug: "borsa" },
      { name: "Kripto", slug: "kripto" },
      { name: "BIST100", slug: "bist100" },
      { name: "Altın", slug: "altin" },
      { name: "Yatırım", slug: "yatirim" },
      { name: "Enflasyon", slug: "enflasyon" },
    ],
  },
  girisimcilik: {
    accent: "#fb923c",
    secondary: "#ea580c",
    bgFrom: "from-orange-950/70",
    bgVia: "via-amber-900/30",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-400",
    badgeBorder: "border-orange-500/30",
    borderHover: "hover:border-orange-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(251,146,60,0.15)]",
    pattern: "launch",
    popularTags: [
      { name: "Startup", slug: "startup" },
      { name: "SaaS", slug: "saas" },
      { name: "YatırımTuru", slug: "yatirim-turu" },
      { name: "Pazarlama", slug: "pazarlama" },
      { name: "İşFikri", slug: "is-fikri" },
      { name: "Exit", slug: "exit" },
    ],
  },
  mizah: {
    accent: "#fbbf24",
    secondary: "#d97706",
    bgFrom: "from-yellow-950/70",
    bgVia: "via-amber-900/30",
    badgeBg: "bg-yellow-500/10",
    badgeText: "text-yellow-400",
    badgeBorder: "border-yellow-500/30",
    borderHover: "hover:border-yellow-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]",
    pattern: "comic",
    popularTags: [
      { name: "Meme", slug: "meme" },
      { name: "GününKomikliği", slug: "gunun-komikligi" },
      { name: "Caps", slug: "caps" },
      { name: "Absürt", slug: "absurt" },
      { name: "Eğlence", slug: "eglence" },
      { name: "Troll", slug: "troll" },
    ],
  },
  "komplo-teorileri": {
    accent: "#c084fc",
    secondary: "#9333ea",
    bgFrom: "from-purple-950/70",
    bgVia: "via-violet-900/30",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/30",
    borderHover: "hover:border-purple-400/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(192,132,252,0.15)]",
    pattern: "vortex",
    popularTags: [
      { name: "Uzaylılar", slug: "uzaylilar" },
      { name: "Gizemler", slug: "gizemler" },
      { name: "ParalelEvren", slug: "paralel-evren" },
      { name: "Simülasyon", slug: "simulasyon" },
      { name: "Bilinmeyen", slug: "bilinmeyen" },
      { name: "Teoriler", slug: "teoriler" },
    ],
  },
}

function getDefaultTheme(color: string): CategoryTheme {
  return {
    accent: color || "#22d3ee",
    secondary: color || "#06b6d4",
    bgFrom: "from-slate-900/80",
    bgVia: "via-slate-900/40",
    badgeBg: "bg-primary/10",
    badgeText: "text-primary",
    badgeBorder: "border-primary/30",
    borderHover: "hover:border-primary/60",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]",
    pattern: "default",
    popularTags: [
      { name: "Tartışma", slug: "tartisma" },
      { name: "SoruCevap", slug: "soru-cevap" },
      { name: "Rehber", slug: "rehber" },
      { name: "Öneri", slug: "oneri" },
    ],
  }
}

// Visual Cover SVG Pattern component
function CoverPattern({ pattern, color }: { pattern: CategoryTheme["pattern"]; color: string }) {
  switch (pattern) {
    case "neural":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="neural-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="20%" cy="30%" r="3" fill={color} />
          <circle cx="50%" cy="20%" r="4" fill={color} />
          <circle cx="80%" cy="35%" r="3.5" fill={color} />
          <circle cx="35%" cy="70%" r="4" fill={color} />
          <circle cx="70%" cy="75%" r="3" fill={color} />
          <line x1="20%" y1="30%" x2="50%" y2="20%" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="50%" y1="20%" x2="80%" y2="35%" stroke={color} strokeWidth="1" />
          <line x1="20%" y1="30%" x2="35%" y2="70%" stroke={color} strokeWidth="1" />
          <line x1="50%" y1="20%" x2="35%" y2="70%" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="80%" y1="35%" x2="70%" y2="75%" stroke={color} strokeWidth="1" />
          <line x1="35%" y1="70%" x2="70%" y2="75%" stroke={color} strokeWidth="1" />
          <circle cx="50%" cy="20%" r="16" fill="url(#neural-glow)" />
        </svg>
      )
    case "circuit":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 25 H 40 L 60 45 H 120 M80 0 V 30 L 105 55 V 100 M140 15 H 200 L 220 35 H 300 M240 100 V 60 L 260 40 H 350"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
          />
          <circle cx="40" cy="25" r="2.5" fill={color} />
          <circle cx="120" cy="45" r="2.5" fill={color} />
          <circle cx="220" cy="35" r="2.5" fill={color} />
          <rect x="150" y="55" width="24" height="24" rx="3" fill="none" stroke={color} strokeWidth="1" />
        </svg>
      )
    case "gaming":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={color} strokeWidth="1" fill="none">
            <polygon points="50,15 75,30 50,45 25,30" />
            <polygon points="50,45 75,30 75,55 50,70" />
            <polygon points="50,45 25,30 25,55 50,70" />
            <polygon points="120,25 145,40 120,55 95,40" />
            <polygon points="120,55 145,40 145,65 120,80" />
            <polygon points="120,55 95,40 95,65 120,80" />
            <polygon points="220,10 240,22 220,34 200,22" />
          </g>
          <circle cx="85%" cy="30%" r="2" fill={color} />
          <circle cx="88%" cy="40%" r="2" fill={color} />
          <circle cx="91%" cy="30%" r="2" fill={color} />
        </svg>
      )
    case "stadium":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={color} strokeWidth="1.2" fill="none">
            <ellipse cx="50%" cy="90%" rx="35%" ry="45%" strokeDasharray="4 3" />
            <ellipse cx="50%" cy="90%" rx="20%" ry="28%" />
            <line x1="15%" y1="90%" x2="85%" y2="90%" />
            <rect x="42%" y="75%" width="16%" height="20%" rx="2" />
            <circle cx="50%" cy="90%" r="3" fill={color} />
          </g>
        </svg>
      )
    case "radar":
      return (
        <svg
          className="absolute inset-0 size-full opacity-25 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="85%" cy="30%" r="20" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="85%" cy="30%" r="45" stroke={color} strokeWidth="1" fill="none" opacity="0.2" />
          <circle cx="85%" cy="30%" r="75" stroke={color} strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.15" />
          <line x1="85%" y1="30%" x2="60%" y2="80%" stroke={color} strokeWidth="1.2" opacity="0.4" />
          <circle cx="85%" cy="30%" r="3" fill={color} />
        </svg>
      )
    case "aurora":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-20 60 Q 60 10 140 50 T 300 30 T 450 70"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M-20 75 Q 80 25 170 65 T 330 45 T 480 85"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
      )
    case "academic":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={color} strokeWidth="1" fill="none">
            <line x1="20" y1="80" x2="20" y2="20" />
            <line x1="30" y1="80" x2="30" y2="20" />
            <line x1="40" y1="80" x2="40" y2="20" />
            <line x1="15" y1="20" x2="45" y2="20" />
            <line x1="10" y1="80" x2="50" y2="80" />
            <polygon points="120,20 160,35 120,50 80,35" />
            <line x1="120" y1="50" x2="120" y2="70" />
          </g>
        </svg>
      )
    case "candlestick":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={color} strokeWidth="1.2">
            <line x1="40" y1="15" x2="40" y2="75" />
            <rect x="35" y="30" width="10" height="30" fill={color} rx="1" />
            <line x1="75" y1="25" x2="75" y2="85" />
            <rect x="70" y="40" width="10" height="25" fill="none" rx="1" />
            <line x1="110" y1="10" x2="110" y2="70" />
            <rect x="105" y="20" width="10" height="35" fill={color} rx="1" />
            <line x1="145" y1="30" x2="145" y2="90" />
            <rect x="140" y="45" width="10" height="25" fill={color} rx="1" />
            <line x1="180" y1="15" x2="180" y2="65" />
            <rect x="175" y="22" width="10" height="28" fill="none" rx="1" />
          </g>
          <path
            d="M30 65 L 75 55 L 110 30 L 145 48 L 180 25 L 220 15"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      )
    case "launch":
      return (
        <svg
          className="absolute inset-0 size-full opacity-25 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 10 90 Q 60 70 120 40 T 260 10"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <ellipse cx="120" cy="40" rx="30" ry="12" stroke={color} strokeWidth="1" strokeDasharray="3 3" fill="none" transform="rotate(-25 120 40)" />
          <circle cx="260" cy="10" r="3" fill={color} />
          <circle cx="30" cy="80" r="1.5" fill={color} />
          <circle cx="50" cy="72" r="2" fill={color} />
        </svg>
      )
    case "comic":
      return (
        <svg
          className="absolute inset-0 size-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" fill={color} />
              <circle cx="10" cy="10" r="1.5" fill={color} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      )
    case "vortex":
      return (
        <svg
          className="absolute inset-0 size-full opacity-25 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke={color} strokeWidth="1" fill="none">
            <ellipse cx="80%" cy="50%" rx="60" ry="25" strokeDasharray="4 3" transform="rotate(35 240 50)" />
            <ellipse cx="80%" cy="50%" rx="40" ry="16" transform="rotate(35 240 50)" />
            <ellipse cx="80%" cy="50%" rx="20" ry="8" transform="rotate(35 240 50)" />
            <circle cx="80%" cy="50%" r="3" fill={color} />
          </g>
        </svg>
      )
    default:
      return (
        <svg
          className="absolute inset-0 size-full opacity-15 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={color} strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )
  }
}

export function CategoriesPageView({
  categories,
  totalTopics,
  categoryTagsMap = {},
}: CategoriesPageViewProps) {
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "tech" | "lifestyle" | "fun">("all")

  // Filter categories by search term and tab
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const term = search.toLowerCase().trim()
      const theme = CATEGORY_THEMES[cat.slug] || getDefaultTheme(cat.color)

      // Search match
      if (term) {
        const matchesName = cat.name.toLowerCase().includes(term)
        const matchesSlug = cat.slug.toLowerCase().includes(term)
        const matchesDesc = cat.description ? cat.description.toLowerCase().includes(term) : false
        const matchesTags = theme.popularTags.some(
          (t) => t.name.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term)
        )
        const matchesDbTags = (categoryTagsMap[cat.id] || []).some(
          (t) => t.name.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term)
        )
        if (!matchesName && !matchesSlug && !matchesDesc && !matchesTags && !matchesDbTags) {
          return false
        }
      }

      // Group tab filter
      if (activeFilter === "tech") {
        return ["yapay-zeka", "teknoloji", "finans", "girisimcilik"].includes(cat.slug)
      }
      if (activeFilter === "lifestyle") {
        return ["gundem", "iliskiler", "universite", "komplo-teorileri"].includes(cat.slug)
      }
      if (activeFilter === "fun") {
        return ["oyun", "futbol", "mizah"].includes(cat.slug)
      }

      return true
    })
  }, [categories, search, activeFilter, categoryTagsMap])

  // Sort by topicCount descending
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => b.topicCount - a.topicCount)
  }, [filteredCategories])

  return (
    <div className="space-y-8">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-muted/40 p-6 sm:p-8 backdrop-blur-md">
        {/* Subtle background glow */}
        <div
          className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
            <LayoutGrid className="size-3.5" />
            <span>Topluluk & İlgi Alanları Haritası</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground text-balance">
            Tüm Forum Kategorileri
          </h1>

          <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
            Yapay zekadan donanıma, spordan finansa kadar neonsform ekosistemindeki tüm topluluk alanlarını
            keşfedin. Her kategorideki güncel tartışmaları inceleyin, alt etiketleri tarayın veya yeni bir başlık açarak sohbeti başlatın.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <strong className="text-foreground font-bold tabular-nums text-sm">{categories.length}</strong> Kategori
            </span>
            <span aria-hidden="true" className="text-border">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <strong className="text-foreground font-bold tabular-nums text-sm">{totalTopics}</strong> Toplam Tartışma
            </span>
            <span aria-hidden="true" className="text-border">·</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Sparkles className="size-3.5" /> Canlı Topluluk Veritabanı
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-5 border-t border-border/60">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kategori, açıklama veya alt etiket ara (örn: #LLM, #Steam)..."
              className="pl-9.5 pr-8 bg-background/80 border-border h-10 text-sm focus-visible:ring-primary/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>

          {/* Group Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tümü ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("tech")}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === "tech"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Teknoloji & Finans
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("fun")}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === "fun"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Oyun & Spor & Mizah
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("lifestyle")}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === "lifestyle"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gündem & Yaşam
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {sortedCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40">
          <Search className="mx-auto size-10 text-muted-foreground mb-3 opacity-60" />
          <h2 className="text-base font-semibold text-foreground">Eşleşen Kategori Bulunamadı</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            &ldquo;{search}&rdquo; aramanızla veya seçili filtreyle eşleşen bir kategori bulunamadı. Lütfen arama terimini değiştirin.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("")
              setActiveFilter("all")
            }}
            className="mt-4 text-xs"
          >
            Filtreleri Sıfırla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedCategories.map((cat, index) => {
            const theme = CATEGORY_THEMES[cat.slug] || getDefaultTheme(cat.color)
            const isTopActive = index < 3 && cat.topicCount > 0

            // Combine DB tags with curated tags for rich discovery
            const dbTags = categoryTagsMap[cat.id] || []
            const tagSet = new Map<string, { name: string; slug: string }>()

            // Add db tags first
            dbTags.forEach((t) => {
              tagSet.set(t.name.toLowerCase(), { name: t.name, slug: t.slug })
            })
            // Then fill with curated tags
            theme.popularTags.forEach((t) => {
              if (!tagSet.has(t.name.toLowerCase())) {
                tagSet.set(t.name.toLowerCase(), t)
              }
            })
            const displayTags = Array.from(tagSet.values()).slice(0, 5)

            return (
              <div
                key={cat.id}
                className={`group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 ${theme.borderHover} ${theme.glowClass} hover:shadow-xl`}
              >
                <div>
                  {/* Top Cover Banner with Custom Pattern & Gradient */}
                  <div
                    className={`relative h-24 w-full overflow-hidden bg-gradient-to-r ${theme.bgFrom} ${theme.bgVia} to-background/40 p-4 border-b border-border/40`}
                  >
                    {/* Visual pattern overlay */}
                    <CoverPattern pattern={theme.pattern} color={theme.accent} />

                    {/* Gradient overlay scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none" />

                    {/* Top Right Badges */}
                    <div className="relative z-10 flex items-center justify-end gap-1.5">
                      {isTopActive && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                          <Flame className="size-2.5" /> Popüler
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground backdrop-blur-sm">
                        <MessageSquare className="size-3 text-muted-foreground" />
                        <span className="tabular-nums">{cat.topicCount}</span> Konu
                      </span>
                    </div>
                  </div>

                  {/* Icon medallion overlapping banner and body */}
                  <div className="px-5 pt-0 relative">
                    <div className="-mt-8 mb-3 flex items-end justify-between">
                      <Link
                        href={`/kategori/${cat.slug}`}
                        className="relative z-10 flex size-14 items-center justify-center rounded-2xl border shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
                        style={{
                          color: theme.accent,
                          backgroundColor: `${theme.accent}14`,
                          borderColor: `${theme.accent}40`,
                          boxShadow: `0 8px 20px -4px ${theme.accent}25`,
                        }}
                      >
                        <CategoryIcon icon={cat.icon} className="size-6" />
                      </Link>

                      <Link
                        href={`/kategori/${cat.slug}`}
                        className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors inline-flex items-center gap-0.5 mb-1"
                      >
                        <span>İncele</span>
                        <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </div>

                    {/* Category Title & Description */}
                    <Link href={`/kategori/${cat.slug}`} className="block group/title">
                      <h2 className="text-base sm:text-lg font-bold text-foreground transition-colors group-hover/title:text-primary">
                        {cat.name}
                      </h2>
                    </Link>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {cat.description ||
                        `${cat.name} alanındaki en yeni tartışmalar, topluluk rehberleri ve sorular.`}
                    </p>

                    {/* Popüler Alt Etiketler (Sub-tags) Section */}
                    {displayTags.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-2">
                          <Tag className="size-3" style={{ color: theme.accent }} />
                          <span>Popüler Alt Etiketler:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {displayTags.map((tag) => (
                            <Link
                              key={tag.slug}
                              href={`/etiket/${tag.slug}`}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/70 text-muted-foreground border border-border/60 hover:border-primary/50 hover:bg-card hover:text-foreground transition-all"
                              title={`#${tag.name} etiketli konuları gör`}
                            >
                              <span className="opacity-50">#</span>
                              <span>{tag.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="mt-5 p-4 px-5 pt-3 border-t border-border/50 bg-muted/10 flex items-center justify-between gap-2">
                  <Link
                    href={`/kategori/${cat.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
                    style={{ color: theme.accent }}
                  >
                    <span>Konuları Gör</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href={`/yeni-konu?kategori=${cat.id}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                    )}
                    title={`${cat.name} kategorisinde yeni bir konu aç`}
                  >
                    <Plus className="size-3.5" />
                    <span>Konu Aç</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
