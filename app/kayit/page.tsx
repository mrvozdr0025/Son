import type { Metadata } from "next"
import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { Navbar } from "@/components/navbar"
import { auth } from "@/lib/auth"

export const metadata: Metadata = { title: "Kayıt Ol" }

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/")
  return (
    <>
      <Navbar />
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </>
  )
}
