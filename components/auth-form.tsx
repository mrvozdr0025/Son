"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"
  const next = searchParams.get("next") ?? "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Bir hata oluştu")
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="glass w-full max-w-sm border-border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isSignUp ? "Aramıza katıl" : "Tekrar hoş geldin"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp
              ? "Konular aç, yorum yap, karma topla"
              : "Devam etmek için giriş yap"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Kullanıcı adı</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Lütfen bekle..." : isSignUp ? "Hesap oluştur" : "Giriş yap"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
          <Link
            href={isSignUp ? "/giris" : "/kayit"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isSignUp ? "Giriş yap" : "Kayıt ol"}
          </Link>
        </p>
      </Card>
    </main>
  )
}
