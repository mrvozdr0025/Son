'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold mb-2">Bir şeyler ters gitti</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Sayfa yüklenirken bir sorun oluştu.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Yeniden Dene
      </button>
    </div>
  )
}
