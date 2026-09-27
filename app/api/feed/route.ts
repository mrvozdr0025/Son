import { NextResponse } from "next/server"
import { getFeedWithCursor, type FeedSort } from "@/lib/queries"
import { getCurrentProfile } from "@/lib/session"

// Serves subsequent feed pages for high-performance cursor pagination.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const sortParam = url.searchParams.get("sirala") ?? "aktif"
  const sort = (["yeni", "populer", "aktif", "takip"].includes(sortParam)
    ? sortParam
    : "aktif") as FeedSort

  const cursor = url.searchParams.get("cursor") || null
  const categoryIdRaw = url.searchParams.get("kategori")
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined

  // Viewer is needed for the "takip" feed and for muting on every feed.
  const profile = await getCurrentProfile()
  if (sort === "takip" && !profile) {
    return NextResponse.json({ topics: [], nextCursor: null, hasMore: false })
  }
  const viewerProfileId = profile?.id

  const result = await getFeedWithCursor({
    sort,
    categoryId,
    cursor,
    viewerProfileId,
  })

  return NextResponse.json(result)
}
