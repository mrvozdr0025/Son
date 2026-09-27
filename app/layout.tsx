// Analytics stub for non-Vercel environment
const Analytics = () => null
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Footer } from '@/components/footer'
import { PwaRegister } from '@/components/pwa-register'
import { ViewTracker } from '@/components/view-tracker'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'
import { OfflineIndicator } from '@/components/offline-indicator'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { BackToTopButton } from '@/components/back-to-top-button'
import { ThemeProvider } from '@/components/theme-provider'
import { getSiteThemeSettings, getUserThemePreference } from '@/app/actions/theme-settings'
import { getSiteSettings } from '@/app/actions/site-settings'
import { getActiveAnnouncement } from '@/app/actions/moderation'
import { generateWebsiteJsonLd, generateOrganizationJsonLd, getBaseUrl } from '@/lib/seo'
import { CustomCodeInjector } from '@/components/custom-code-injector'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

const siteUrl = getBaseUrl()

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'neonsform — Türkiye’nin AI Destekli Tartışma Platformu',
    template: '%s | neonsform',
  },
  description:
    'Teknoloji, oyun, futbol, gündem ve yapay zeka. Türkiye’nin en canlı AI destekli forum topluluğuna katıl, fikirlerini paylaş, oy ver.',
  keywords: [
    'forum',
    'yapay zeka forum',
    'teknoloji tartışmaları',
    'türkiye forum',
    'oyun topluluğu',
    'ai tartışma',
    'neonsform',
    'yazılım',
    'donanım',
    'türk forumları',
  ],
  authors: [{ name: 'neonsform Topluluğu', url: siteUrl }],
  creator: 'neonsform',
  publisher: 'neonsform',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'neonsform',
  },
  openGraph: {
    title: 'neonsform — Türkiye’nin AI Destekli Tartışma Platformu',
    description:
      'Teknoloji, oyun, futbol, gündem ve yapay zeka. Türkiye’nin en canlı AI destekli forum topluluğuna katıl, fikirlerini paylaş, oy ver.',
    url: siteUrl,
    siteName: 'neonsform',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'neonsform — Türkiye’nin AI Destekli Tartışma Platformu',
    description:
      'Teknoloji, oyun, futbol, gündem ve yapay zeka. Türkiye’nin en canlı AI destekli forum topluluğuna katıl, fikirlerini paylaş, oy ver.',
    creator: '@neonsform',
    site: '@neonsform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d0f17',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let activeAnnouncement = null
  let defaultSiteTheme: "system" | "dark" | "light" = "system"
  let userTheme: "system" | "dark" | "light" = "system"
  let siteConfig = null

  try {
    const [announcementRes, siteThemeRes, userThemeRes, siteConfigRes] = await Promise.all([
      getActiveAnnouncement().catch(() => null),
      getSiteThemeSettings().catch(() => ({ defaultTheme: "system" as const })),
      getUserThemePreference().catch(() => ({ theme: "system" as const })),
      getSiteSettings().catch(() => null),
    ])
    activeAnnouncement = announcementRes
    defaultSiteTheme = siteThemeRes.defaultTheme
    userTheme = userThemeRes.theme
    siteConfig = siteConfigRes
  } catch {
    // ignore
  }

  const websiteJsonLd = generateWebsiteJsonLd()
  const organizationJsonLd = generateOrganizationJsonLd()

  return (
    <html lang="tr" className="dark bg-background" suppressHydrationWarning>
      <head>
        {/* Google Search Console Verification */}
        {siteConfig?.googleSearchConsoleCode && (
          <meta name="google-site-verification" content={siteConfig.googleSearchConsoleCode} />
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="antialiased font-sans">
        {/* Google Tag Manager - Body (noscript) */}
        {siteConfig?.googleTagManagerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${siteConfig.googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}

        {/* Analytics, Ads, and Custom Code Injector */}
        <CustomCodeInjector
          customHeadCode={siteConfig?.customHeadCode}
          customBodyCode={siteConfig?.customBodyCode}
          googleAnalyticsId={siteConfig?.googleAnalyticsId}
          googleTagManagerId={siteConfig?.googleTagManagerId}
          googleAdsenseId={siteConfig?.googleAdsenseId}
        />

        <ThemeProvider defaultSiteTheme={defaultSiteTheme} initialUserTheme={userTheme}>
          <div className="ambient-bg" aria-hidden="true" />
          <AnnouncementBanner initialData={activeAnnouncement} />
          <div className="flex min-h-screen flex-col w-full min-w-0">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <ViewTracker />
          <PwaRegister />
          <KeyboardShortcutsDialog />
          <OfflineIndicator />
          <BackToTopButton />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
