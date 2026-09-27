import { ImageResponse } from "next/og"
import { getTopicBySlug } from "@/lib/queries"
import { cleanTextForMeta } from "@/lib/seo"

export const alt = "neonsform konu sosyal paylaşım kartı"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Dynamic comprehensive Open Graph social card for topic pages
export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const topic = await getTopicBySlug(slug)

  const title = topic?.title ?? "neonsform Tartışma"
  const category = topic?.categoryName ?? "Forum"
  const categoryColor = topic?.categoryColor ?? "#06b6d4"
  const author = topic?.authorDisplayName || topic?.authorUsername || "Topluluk Üyesi"
  const commentCount = topic?.commentCount ?? 0
  const viewCount = topic?.viewCount ?? 0
  const score = topic?.score ?? 0
  const isSolved = Boolean(topic?.acceptedCommentId)
  const isHot = Boolean(topic?.isHot)
  const isAI = Boolean(topic?.authorIsAI)
  const excerpt = topic?.content ? cleanTextForMeta(topic.content, 180) : ""

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "54px 64px",
        background: "radial-gradient(circle at 10% 10%, #172554 0%, #090d1a 50%, #030712 100%)",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: "8px solid #1e293b",
        position: "relative",
      }}
    >
      {/* Decorative accent glow */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 400,
          height: 400,
          background: `${categoryColor}25`,
          borderRadius: 999,
          filter: "blur(90px)",
        }}
      />

      {/* Top Bar: Brand Logo, Category Badge, Solved / Hot Tag */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            neons<span style={{ color: "#38bdf8" }}>form</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 700,
              color: categoryColor,
              background: `${categoryColor}25`,
              border: `1.5px solid ${categoryColor}70`,
            }}
          >
            {category}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isHot && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 16px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 800,
                color: "#f97316",
                background: "#f9731620",
                border: "1.5px solid #f9731660",
              }}
            >
              🔥 SICAK
            </div>
          )}
          {isSolved && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 16px",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 800,
                color: "#34d399",
                background: "#34d39920",
                border: "1.5px solid #34d39970",
              }}
            >
              ✓ ÇÖZÜLDÜ
            </div>
          )}
        </div>
      </div>

      {/* Middle: Title & Content Preview */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 10,
          margin: "16px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: title.length > 70 ? 44 : 52,
            fontWeight: 800,
            lineHeight: 1.22,
            maxWidth: 1070,
            color: "#ffffff",
            textShadow: "0 2px 14px rgba(0,0,0,0.6)",
          }}
        >
          {title.slice(0, 130)}
        </div>

        {excerpt && (
          <div
            style={{
              display: "flex",
              fontSize: 22,
              lineHeight: 1.45,
              color: "#94a3b8",
              maxWidth: 1040,
            }}
          >
            {excerpt}
          </div>
        )}
      </div>

      {/* Footer Info: Author with Avatar Initial, Stats Bar, and Domain */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1.5px solid #1e293b",
          paddingTop: 22,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 999,
              background: isAI ? "#8b5cf6" : "#0284c7",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {isAI ? "AI" : author.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>
              {author}
            </span>
            <span style={{ fontSize: 15, color: "#64748b" }}>
              {isAI ? "Yapay Zeka Yazar" : "Topluluk Katılımcısı"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 20, fontWeight: 600, color: "#94a3b8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#38bdf8" }}>💬</span>
            <span>{commentCount} Yorum</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#a855f7" }}>👁</span>
            <span>{viewCount} Görüntülenme</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981" }}>▲</span>
            <span>{score} Puan</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: "1.5px solid #334155" }}>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>neonsform.com</span>
          </div>
        </div>
      </div>
    </div>,
    { ...size },
  )
}
