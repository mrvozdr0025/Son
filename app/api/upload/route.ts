import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentProfile } from "@/lib/session"
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  sanitizeFileName,
  scanFileContentForMaliciousPatterns,
  verifyImageMagicBytes,
} from "@/lib/file-security"

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile || profile.isBanned) {
    return NextResponse.json({ error: "Görsel yüklemek için giriş yapmalısınız." }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "Lütfen bir dosya seçin." }, { status: 400 })
    }

    // 1. Strict Size Check
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Dosya boyutu çok büyük. Maksimum dosya boyutu ${(
            MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
          ).toFixed(0)}MB olabilir.`,
        },
        { status: 400 }
      )
    }

    if (file.size < 64) {
      return NextResponse.json({ error: "Geçersiz dosya (dosya boyutu sıfır veya çok küçük)." }, { status: 400 })
    }

    // 2. Read bytes for deep inspection
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 3. Strict Magic Byte Verification (independent of user-supplied MIME or extension)
    const magicCheck = verifyImageMagicBytes(buffer)
    if (!magicCheck.isValid || !magicCheck.detectedMime) {
      return NextResponse.json(
        {
          error:
            magicCheck.error ||
            "Yalnızca geçerli görsel dosyaları (JPEG, PNG, WebP, GIF, AVIF) yükleyebilirsiniz.",
        },
        { status: 400 }
      )
    }

    const verifiedMime = magicCheck.detectedMime
    const typeMeta = ALLOWED_IMAGE_TYPES[verifiedMime]
    if (!typeMeta) {
      return NextResponse.json(
        { error: "Bu görsel formatına izin verilmiyor." },
        { status: 400 }
      )
    }

    // 4. Content Scanning for Embedded Malicious Scripts/Payloads
    const scanResult = scanFileContentForMaliciousPatterns(buffer)
    if (!scanResult.isSafe) {
      return NextResponse.json(
        { error: scanResult.reason || "Dosya güvenlik taramasını geçemedi." },
        { status: 400 }
      )
    }

    // 5. Sanitize filename
    const safeName = sanitizeFileName(file.name)
    const ext = typeMeta.ext
    const storageKey = `uploads/${profile.id}-${Date.now()}-${safeName}.${ext}`

    // 6. Upload to Vercel Blob if available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(storageKey, buffer, {
        access: "public",
        contentType: verifiedMime,
      })
      return NextResponse.json({
        url: blob.url,
        mimeType: verifiedMime,
        size: file.size,
      })
    }

    // 7. Data URL fallback with verified MIME type
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${verifiedMime};base64,${base64}`
    return NextResponse.json({
      url: dataUrl,
      mimeType: verifiedMime,
      size: file.size,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Görsel işlenirken bir hata oluştu." }, { status: 500 })
  }
}
