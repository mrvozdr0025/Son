export interface LevelTier {
  level: number
  title: string
  minXp: number
  maxXp: number
  badgeColor: string
  bgGlow: string
  icon: string
  description: string
  perks: string[]
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    level: 1,
    title: "Çaylak",
    minXp: 0,
    maxXp: 100,
    badgeColor: "#94a3b8",
    bgGlow: "rgba(148, 163, 184, 0.15)",
    icon: "Sparkles",
    description: "neonsform dünyasına yeni adım atmış meraklı üye.",
    perks: ["Temel forum erişimi", "Yorum yapma ve konu açma", "Gündem takibi"],
  },
  {
    level: 2,
    title: "Çırak",
    minXp: 100,
    maxXp: 300,
    badgeColor: "#38bdf8",
    bgGlow: "rgba(56, 189, 248, 0.15)",
    icon: "BookOpen",
    description: "Tartışmalara aktif katılan, tecrübe kazanan üye.",
    perks: ["Yorum tepkileri (emojiler)", "Anket oylamasına katılım", "Özel takma ad renkleri"],
  },
  {
    level: 3,
    title: "Neon Gezgini",
    minXp: 300,
    maxXp: 650,
    badgeColor: "#22d3ee",
    bgGlow: "rgba(34, 211, 238, 0.15)",
    icon: "Compass",
    description: "Kategorileri keşfeden ve kaliteli içerik üreten üye.",
    perks: ["Profil renk temaları açıldı", "Haftalık görevlerde bonus XP", "Rozet vitrini kullanımı"],
  },
  {
    level: 4,
    title: "Neon Kaşif",
    minXp: 650,
    maxXp: 1200,
    badgeColor: "#4ade80",
    bgGlow: "rgba(74, 222, 128, 0.15)",
    icon: "MapPin",
    description: "Topluluğun nabzını tutan, popüler tartışmalar başlatan üye.",
    perks: ["Hızlı bildirimler", "Yorumlarda özel kaşif rozeti", "Kendi konularına anket ekleme"],
  },
  {
    level: 5,
    title: "Siber Savunucu",
    minXp: 1200,
    maxXp: 2000,
    badgeColor: "#a3e635",
    bgGlow: "rgba(163, 230, 53, 0.15)",
    icon: "Shield",
    description: "Yardımsever cevaplarıyla topluluğu zenginleştiren rehber üye.",
    perks: ["'En İyi Cevap' seçilme önceliği", "Gelişmiş arama filtreleri", "Profil kapağı özelleştirme"],
  },
  {
    level: 6,
    title: "Siber Üstat",
    minXp: 2000,
    maxXp: 3200,
    badgeColor: "#facc15",
    bgGlow: "rgba(250, 204, 21, 0.15)",
    icon: "Award",
    description: "Derin teknik bilgiye sahip ve forumda saygı duyulan usta tartışmacı.",
    perks: ["Altın Seviye Rozeti", "AI Arenası'nda VIP hakem oyu", "Konu sabitleme adayı olma"],
  },
  {
    level: 7,
    title: "Kod Mimarı",
    minXp: 3200,
    maxXp: 5000,
    badgeColor: "#fb923c",
    bgGlow: "rgba(251, 146, 60, 0.15)",
    icon: "Cpu",
    description: "Forumun fikir önderlerinden, algoritma ve teknoloji mimarı.",
    perks: ["AI Personalarıyla derin sohbet", "Özel zengin metin efektleri", "Topluluk anket önerisi sunma"],
  },
  {
    level: 8,
    title: "Yapay Zeka Efsanesi",
    minXp: 5000,
    maxXp: 7500,
    badgeColor: "#f87171",
    bgGlow: "rgba(248, 113, 113, 0.15)",
    icon: "Brain",
    description: "İnsan ve yapay zeka sınırlarını aşmış, efsanevi forum yazarı.",
    perks: ["Kırmızı neon neon parıltılı profil", "Haftalık bültende öne çıkarılma", "Özel unvan seçimi"],
  },
  {
    level: 9,
    title: "Siber Lord",
    minXp: 7500,
    maxXp: 11000,
    badgeColor: "#c084fc",
    bgGlow: "rgba(192, 132, 252, 0.15)",
    icon: "Crown",
    description: "Siber evrenin efendisi; forumun en kıdemli ve etkili figürü.",
    perks: ["Mor Taç Rozeti", "Tüm profil temaları kilitsiz", "Özel rozet vitrininde 5 rozet"],
  },
  {
    level: 10,
    title: "Neon Efsanesi",
    minXp: 11000,
    maxXp: 999999,
    badgeColor: "#f43f5e",
    bgGlow: "rgba(244, 63, 94, 0.2)",
    icon: "Zap",
    description: "Zirvenin tek sahibi. neonsform tarihine adını altın harflerle yazdırmış varlık.",
    perks: ["Ebedi Şöhret Salonu", "Özel animasyonlu profil çerçevesi", "Tüm VIP haklar ve sınırsız saygı"],
  },
]

export function getLevelTier(levelNumber: number): LevelTier {
  const cleanLevel = Math.max(1, Math.min(10, Math.floor(levelNumber)))
  return LEVEL_TIERS.find((t) => t.level === cleanLevel) ?? LEVEL_TIERS[0]
}

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp)
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_TIERS[i].minXp) {
      return LEVEL_TIERS[i].level
    }
  }
  return 1
}

export interface LevelProgressInfo {
  currentTier: LevelTier
  nextTier: LevelTier | null
  currentXp: number
  tierMinXp: number
  tierMaxXp: number
  progressPercent: number
  xpRemaining: number
  isMaxLevel: boolean
}

export function getLevelProgressInfo(xp: number, level?: number): LevelProgressInfo {
  const safeXp = Math.max(0, xp)
  const calcLevel = level ?? getLevelFromXp(safeXp)
  const currentTier = getLevelTier(calcLevel)
  const isMaxLevel = currentTier.level >= 10
  const nextTier = isMaxLevel ? null : getLevelTier(currentTier.level + 1)

  const range = currentTier.maxXp - currentTier.minXp
  const currentInTier = Math.max(0, safeXp - currentTier.minXp)
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((currentInTier / range) * 100)))
  const xpRemaining = isMaxLevel ? 0 : Math.max(0, currentTier.maxXp - safeXp)

  return {
    currentTier,
    nextTier,
    currentXp: safeXp,
    tierMinXp: currentTier.minXp,
    tierMaxXp: currentTier.maxXp,
    progressPercent,
    xpRemaining,
    isMaxLevel,
  }
}
