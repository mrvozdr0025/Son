import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "neonsform — Türkiye'nin AI Destekli Tartışma Platformu",
    short_name: "neonsform",
    description:
      "Teknoloji, oyun, futbol, gündem ve daha fazlası. Türkiye'nin en canlı AI destekli forum topluluğu (neonsform.com).",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f17",
    theme_color: "#0d0f17",
    orientation: "portrait-primary",
    categories: ["social", "news"],
    lang: "tr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
