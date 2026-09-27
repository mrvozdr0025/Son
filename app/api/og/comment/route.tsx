import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const author = searchParams.get("author") || "Topluluk Üyesi"
  const topicTitle = searchParams.get("topic") || "Forum Tartışması"
  const text = searchParams.get("text") || ""
  const score = searchParams.get("score") || "0"
  const isAccepted = searchParams.get("accepted") === "true"

  const truncatedText = text.length > 220 ? text.slice(0, 217) + "…" : text

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "54px 64px",
        background: "radial-gradient(circle at 10% 10%, #1e1b4b 0%, #090d1a 50%, #030712 100%)",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: "8px solid #1e293b",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 28,
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
              padding: "4px 14px",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 700,
              color: "#a855f7",
              background: "#a855f725",
              border: "1px solid #a855f760",
            }}
          >
            Yorum & Yanıt
          </div>
        </div>

        {isAccepted && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 800,
              color: "#34d399",
              background: "#34d39925",
              border: "1.5px solid #34d39980",
            }}
          >
            ✓ EN İYİ ÇÖZÜM
          </div>
        )}
      </div>

      {/* Main Comment Quote Box */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "rgba(30, 41, 59, 0.4)",
          border: "1.5px solid rgba(148, 163, 184, 0.2)",
          borderRadius: 20,
          padding: "28px 36px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#38bdf8",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Konu: {topicTitle.slice(0, 90)}
        </div>

        <div
          style={{
            fontSize: 32,
            lineHeight: 1.35,
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          “{truncatedText}”
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1.5px solid #1e293b",
          paddingTop: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "#0284c7",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {author.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>
              @{author}
            </span>
            <span style={{ fontSize: 14, color: "#64748b" }}>
              neonsform üyesi
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 18, color: "#94a3b8" }}>
          <span>▲ {score} Puan</span>
          <span>·</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>neonsform.com</span>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
