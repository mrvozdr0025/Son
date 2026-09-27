/**
 * Strict file upload validation, magic byte verification, malware/script scanning,
 * and image optimization helpers.
 */

// Max file sizes
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

// Allowed image MIME types and extensions
export const ALLOWED_IMAGE_TYPES: Record<string, { ext: string; minSize: number }> = {
  "image/jpeg": { ext: "jpg", minSize: 128 },
  "image/png": { ext: "png", minSize: 64 },
  "image/webp": { ext: "webp", minSize: 64 },
  "image/gif": { ext: "gif", minSize: 64 },
  "image/avif": { ext: "avif", minSize: 64 },
}

/**
 * Checks magic byte signatures from the start of a buffer.
 */
export function verifyImageMagicBytes(buffer: Buffer): {
  isValid: boolean
  detectedMime: string | null
  error?: string
} {
  if (buffer.length < 16) {
    return { isValid: false, detectedMime: null, error: "Dosya çok küçük veya bozuk." }
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: "image/jpeg" }
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedMime: "image/png" }
  }

  // 3. GIF: 'GIF87a' or 'GIF89a'
  const headerGif = buffer.toString("ascii", 0, 6)
  if (headerGif === "GIF87a" || headerGif === "GIF89a") {
    return { isValid: true, detectedMime: "image/gif" }
  }

  // 4. WebP: RIFF .... WEBP
  const riff = buffer.toString("ascii", 0, 4)
  const webp = buffer.toString("ascii", 8, 12)
  if (riff === "RIFF" && webp === "WEBP") {
    return { isValid: true, detectedMime: "image/webp" }
  }

  // 5. AVIF: .... ftypavif or ftypavis
  const ftyp = buffer.toString("ascii", 4, 8)
  const brand = buffer.toString("ascii", 8, 12)
  if (ftyp === "ftyp" && (brand === "avif" || brand === "avis" || brand === "mif1")) {
    return { isValid: true, detectedMime: "image/avif" }
  }

  return {
    isValid: false,
    detectedMime: null,
    error: "Desteklenmeyen veya geçersiz görsel formatı. Sadece gerçek JPEG, PNG, WebP, GIF veya AVIF dosyaları kabul edilir.",
  }
}

/**
 * Deep content scanner to detect malicious payloads (SVG injection, embedded HTML/JS, PHP webshells)
 * disguised inside image files or EXIF comments.
 */
export function scanFileContentForMaliciousPatterns(buffer: Buffer): {
  isSafe: boolean
  reason?: string
} {
  // Convert first 4KB and last 4KB to string for inspection
  const headStr = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).toLowerCase()
  const tailStr = buffer.length > 4096 
    ? buffer.toString("utf8", buffer.length - 4096).toLowerCase()
    : ""
  const combined = headStr + " " + tailStr

  // Dangerous script patterns
  const dangerousPatterns = [
    "<script",
    "</script>",
    "javascript:",
    "vbscript:",
    "onload=",
    "onerror=",
    "onclick=",
    "<?php",
    "<%",
    "eval(",
    "base64_decode(",
    "system(",
    "passthru(",
    "shell_exec(",
    "<!doctype html",
    "<html",
    "<svg",
  ]

  for (const pattern of dangerousPatterns) {
    if (combined.includes(pattern)) {
      return {
        isSafe: false,
        reason: `Güvenlik taraması başarısız: Dosya şüpheli kod veya betik örüntüsü içeriyor (${pattern}).`,
      }
    }
  }

  return { isSafe: true }
}

/**
 * Sanitizes original filename to prevent path traversal or shell exploits.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_") // prevent ../
    .slice(0, 100)
}
