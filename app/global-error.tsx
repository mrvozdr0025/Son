'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Bir hata oluştu</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || "Beklenmedik bir hata meydana geldi."}
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  )
}
