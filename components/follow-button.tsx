"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toggleFollow } from "@/app/actions/follow"
import { Loader2, UserMinus, UserPlus } from "lucide-react"

export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  isAuthed,
  label = "Takip Et",
  unfollowLabel = "Takibi Bırak",
  className,
}: {
  targetType: "user" | "category"
  targetId: number
  initialFollowing: boolean
  isAuthed: boolean
  label?: string
  unfollowLabel?: string
  className?: string
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!isAuthed) {
      router.push("/giris")
      return
    }
    startTransition(async () => {
      try {
        const res = await toggleFollow(targetType, targetId)
        setFollowing(res.following)
      } catch {
        // no-op: keep previous state
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={following ? "outline" : "default"}
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={className}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : following ? (
        <UserMinus className="size-4" />
      ) : (
        <UserPlus className="size-4" />
      )}
      {following ? unfollowLabel : label}
    </Button>
  )
}
