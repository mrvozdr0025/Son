import "server-only"
import { db } from "@/lib/db"
import { pushSubscriptions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import webpush from "web-push"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

let configured = false
function ensureConfigured() {
  if (configured) return true
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails("mailto:admin@neonsform.com", publicKey, privateKey)
  configured = true
  return true
}

// Send a web push notification to all of a user's subscribed devices.
// Silently no-ops if VAPID keys are missing; cleans up dead subscriptions.
export async function sendPushToProfile(
  profileId: number,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!ensureConfigured()) return

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.profileId, profileId))
  if (subs.length === 0) return

  const body = JSON.stringify(payload)
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        )
      } catch (err) {
        // 404/410 mean the subscription expired — remove it
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
        }
      }
    }),
  )
}
