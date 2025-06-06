"use client"

import { GalleryVerticalEnd, CheckCircle, AlertTriangle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ResendVerificationEmail } from "@/components/ui/resend-verification-email"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const email = searchParams.get("email")
  const token = searchParams.get("token")

  useEffect(() => {
    const verifyEmail = async () => {

      if (!email || !token) {
        setError("No email found. Please check your email link.")
        setIsLoading(false)
        return
      }

      try {
        // First check if user is already signed in and verified
        const { data: session, error: sessionError } = await authClient.getSession()

        if (session && session.user.emailVerified) {
          // User is already signed in and verified, redirect to dashboard
          router.push("/dashboard")
          return
        }

        // If we have a token, proceed with verification
        setIsVerifying(true)
        const result = await authClient.verifyEmail({
          query: {
            token: token
          }
        })

        if (result.error) {
          // Handle specific error cases
          if (result.error.message?.includes("invalid") || result.error.message?.includes("expired")) {
            setError("This verification link is invalid or has expired. Please request a new verification email.")
          } else {
            setError(result.error.message || "Failed to verify email. Please try again.")
          }
          setSuccess(false)
        } else {
          // Email verified successfully
          setSuccess(true)
          // Auto-redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        }
      } catch (err) {
        console.error("Email verification error:", err)
        setError("Something went wrong during email verification. Please try again.")
      } finally {
        setIsLoading(false)
        setIsVerifying(false)
      }
    }

    verifyEmail()
  }, [router, searchParams])

  if (isLoading || isVerifying) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="#" className="flex items-center gap-2 self-center font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            PostCribe
          </a>

          <Card className="bg-card/80 backdrop-blur-sm border-border/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <ThreeDotLoader size="lg" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {isVerifying ? "Verifying your email..." : "Loading..."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isVerifying ? "Please wait while we verify your email address." : "Please wait."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          PostCribe
        </a>

        <div className="flex flex-col gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-border/30">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                {success ? (
                  <CheckCircle className="size-12 text-green-500" />
                ) : (
                  <AlertTriangle className="size-12 text-destructive" />
                )}
              </div>
              <CardTitle className="text-foreground">
                {success ? "Email Verified!" : "Verification Failed"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {success
                  ? "Your email has been successfully verified."
                  : "We couldn't verify your email address."
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      You'll be redirected to your dashboard in a moment.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <ResendVerificationEmail
                  email={email!}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
