"use client"

import { useEffect } from "react"

interface CustomCodeInjectorProps {
  customHeadCode?: string | null
  customBodyCode?: string | null
  googleAnalyticsId?: string | null
  googleTagManagerId?: string | null
  googleAdsenseId?: string | null
}

export function CustomCodeInjector({
  customHeadCode,
  customBodyCode,
  googleAnalyticsId,
  googleTagManagerId,
  googleAdsenseId,
}: CustomCodeInjectorProps) {
  useEffect(() => {
    // 1. Google Tag Manager
    if (googleTagManagerId && googleTagManagerId.trim()) {
      const gtmId = googleTagManagerId.trim()
      if (!document.getElementById("gtm-script")) {
        const script = document.createElement("script")
        script.id = "gtm-script"
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
        document.head.appendChild(script)
      }
    }

    // 2. Google Analytics 4 (GA4)
    if (googleAnalyticsId && googleAnalyticsId.trim()) {
      const gaId = googleAnalyticsId.trim()
      if (!document.getElementById("ga-tag-script")) {
        const script1 = document.createElement("script")
        script1.id = "ga-tag-script"
        script1.async = true
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(script1)

        const script2 = document.createElement("script")
        script2.id = "ga-init-script"
        script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`
        document.head.appendChild(script2)
      }
    }

    // 3. Google AdSense
    if (googleAdsenseId && googleAdsenseId.trim()) {
      const adsId = googleAdsenseId.trim()
      if (!document.getElementById("adsense-script")) {
        const script = document.createElement("script")
        script.id = "adsense-script"
        script.async = true
        script.crossOrigin = "anonymous"
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsId}`
        document.head.appendChild(script)
      }
    }

    // 4. Custom Head Code
    if (customHeadCode && customHeadCode.trim()) {
      if (!document.getElementById("custom-head-injection")) {
        const container = document.createElement("div")
        container.id = "custom-head-injection"
        container.innerHTML = customHeadCode.trim()

        const scripts = container.querySelectorAll("script")
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script")
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value)
          })
          newScript.innerHTML = oldScript.innerHTML
          oldScript.parentNode?.replaceChild(newScript, oldScript)
        })

        while (container.firstChild) {
          document.head.appendChild(container.firstChild)
        }
      }
    }

    // 5. Custom Body Code
    if (customBodyCode && customBodyCode.trim()) {
      if (!document.getElementById("custom-body-injection")) {
        const container = document.createElement("div")
        container.id = "custom-body-injection"
        container.innerHTML = customBodyCode.trim()

        const scripts = container.querySelectorAll("script")
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script")
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value)
          })
          newScript.innerHTML = oldScript.innerHTML
          oldScript.parentNode?.replaceChild(newScript, oldScript)
        })

        while (container.firstChild) {
          document.body.appendChild(container.firstChild)
        }
      }
    }
  }, [customHeadCode, customBodyCode, googleAnalyticsId, googleTagManagerId, googleAdsenseId])

  return null
}
