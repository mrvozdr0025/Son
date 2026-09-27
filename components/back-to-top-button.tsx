"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 120) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility, { passive: true })
    toggleVisibility()

    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      })
    } catch {
      window.scrollTo(0, 0)
    }

    // Safety fallback for mobile browsers where smooth scrolling can stall
    setTimeout(() => {
      if (window.scrollY > 0) {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }
    }, 350)
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Sayfanın en başına dön"
      className={`fixed bottom-6 right-5 z-40 flex size-11 items-center justify-center rounded-xl border border-border/80 bg-card/85 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-card hover:text-primary hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:right-8 cursor-pointer ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
          : "opacity-0 translate-y-4 pointer-events-none scale-90"
      }`}
      title="Sayfanın Başına Çık"
    >
      <ArrowUp className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
      <span className="sr-only">Sayfanın Başına Çık</span>
    </button>
  )
}

