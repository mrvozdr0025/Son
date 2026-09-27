import { db } from "@/lib/db"
import { spamFilters, reports } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export interface SpamCheckResult {
  allowed: boolean
  filteredContent: string
  filteredTitle?: string
  blockedReason?: string
  flaggedReasons: string[]
}

/**
 * Checks content against active spam & blacklist filters.
 * - action='block': Blocks publishing and throws an error/returns allowed=false
 * - action='censor': Replaces matching words with replacement (e.g. '***')
 * - action='flag': Permits posting but automatically queues a report for moderation
 */
export async function checkAndFilterContent(
  content: string,
  title?: string,
  context?: { targetType: "topic" | "comment"; targetId?: number; authorProfileId?: number }
): Promise<SpamCheckResult> {
  try {
    const filters = await db
      .select()
      .from(spamFilters)
      .where(eq(spamFilters.isActive, true))

    if (!filters || filters.length === 0) {
      return {
        allowed: true,
        filteredContent: content,
        filteredTitle: title,
        flaggedReasons: [],
      }
    }

    let processedContent = content
    let processedTitle = title || ""
    const fullTextToCheck = `${title ? title + " " : ""}${content}`.toLowerCase()
    const flaggedReasons: string[] = []

    for (const filter of filters) {
      let isMatch = false
      const pattern = filter.pattern.trim()
      if (!pattern) continue

      if (filter.type === "regex") {
        try {
          const regex = new RegExp(pattern, "gi")
          if (regex.test(fullTextToCheck)) {
            isMatch = true
            if (filter.action === "censor") {
              const rep = filter.replacement || "***"
              processedContent = processedContent.replace(regex, rep)
              if (processedTitle) processedTitle = processedTitle.replace(regex, rep)
            }
          }
        } catch {
          // invalid regex, fallback to substring
          if (fullTextToCheck.includes(pattern.toLowerCase())) isMatch = true
        }
      } else if (filter.type === "domain") {
        // Domain match (e.g. bit.ly, spam-casino.com)
        const domainPattern = pattern.toLowerCase()
        if (fullTextToCheck.includes(domainPattern)) {
          isMatch = true
          if (filter.action === "censor") {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const domainRegex = new RegExp(escaped, "gi")
            const rep = filter.replacement || "[engellenen-link]"
            processedContent = processedContent.replace(domainRegex, rep)
            if (processedTitle) processedTitle = processedTitle.replace(domainRegex, rep)
          }
        }
      } else {
        // Exact or word match
        const wordPattern = pattern.toLowerCase()
        if (fullTextToCheck.includes(wordPattern)) {
          isMatch = true
          if (filter.action === "censor") {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const wordRegex = new RegExp(escaped, "gi")
            const rep = filter.replacement || "***"
            processedContent = processedContent.replace(wordRegex, rep)
            if (processedTitle) processedTitle = processedTitle.replace(wordRegex, rep)
          }
        }
      }

      if (isMatch) {
        // Increment hit count asynchronously
        db.update(spamFilters)
          .set({ hitCount: sql`${spamFilters.hitCount} + 1` })
          .where(eq(spamFilters.id, filter.id))
          .catch(() => {})

        if (filter.action === "block") {
          return {
            allowed: false,
            filteredContent: content,
            filteredTitle: title,
            blockedReason: `İçeriğiniz kurallara aykırı veya yasaklı ifade içeriyor: "${filter.pattern}"`,
            flaggedReasons: [],
          }
        }

        if (filter.action === "flag") {
          flaggedReasons.push(`Spam filtresine takıldı: "${filter.pattern}"`)
        }
      }
    }

    // If flagged, queue automatic moderation report if context provided
    if (flaggedReasons.length > 0 && context?.targetId) {
      db.insert(reports)
        .values({
          targetType: context.targetType,
          targetId: context.targetId,
          reason: `[Otomatik Filtre] ${flaggedReasons.join(", ")}`,
          status: "open",
        })
        .catch(() => {})
    }

    return {
      allowed: true,
      filteredContent: processedContent,
      filteredTitle: title !== undefined ? processedTitle : undefined,
      flaggedReasons,
    }
  } catch (err) {
    console.error("[spam-filter] evaluation failed:", err)
    return {
      allowed: true,
      filteredContent: content,
      filteredTitle: title,
      flaggedReasons: [],
    }
  }
}
