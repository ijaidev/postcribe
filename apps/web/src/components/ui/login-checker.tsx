"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResendVerificationEmail } from "@/components/ui/resend-verification-email"
import { authClient } from "@/lib/auth-client"
import { CLIENT_URL } from "@/config"
import { ThreeDotLoader } from "@/components/ui/loaders/three-dot-loader"

interface LoginCheckerProps {
    children: React.ReactNode
}

export function LoginChecker({ children }: LoginCheckerProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [user, setUser] = useState<{ email: string; emailVerified: boolean } | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [emailVerified, setEmailVerified] = useState(false)


    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const { data: session, error } = await authClient.getSession()

                if (error || !session) {
                    // Not authenticated
                    setIsAuthenticated(false)
                    setUser(null)
                    setEmailVerified(false)

                } else {
                    // Authenticated
                    setIsAuthenticated(true)
                    setUser(session.user)
                    setEmailVerified(session.user.emailVerified || false)
                }
            } catch (err) {
                console.error("Auth check error:", err)
                setIsAuthenticated(false)
                setUser(null)
                setEmailVerified(false)
            } finally {
                setIsLoading(false)
            }
        }

        checkAuthStatus()
    }, [router])

    if (isLoading) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <ThreeDotLoader
                    size="lg"
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
            </div>
        )
    }

    // If authenticated but email not verified, show overlay
    if (isAuthenticated && !emailVerified) {
        return (
            <>
                {/* Email verification modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md">
                        <Card>
                            <CardHeader className="text-center">
                                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                                    <Mail className="size-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <CardTitle className="text-xl">Verify your email</CardTitle>
                                <CardDescription>
                                    Please verify your email address to continue using PostCribe
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Your email address <strong>{user?.email}</strong> needs to be verified before you can access the dashboard.
                                    </AlertDescription>
                                </Alert>

                                {user?.email && (
                                    <ResendVerificationEmail
                                    size="lg"
                                        email={user.email}
                                        callbackURL={CLIENT_URL + "/dashboard"}
                                        helperText="Didn't receive the verification email?"
                                        onSuccess={() => {
                                            // Show success message
                                        }}
                                    />
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={async () => {
                                            await authClient.signOut()
                                            router.push('/signin')
                                        }}
                                    >
                                        Sign out
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={() => {
                                            // Refresh auth status
                                            window.location.reload()
                                        }}
                                    >
                                        I&apos;ve verified
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        )
    }

    // If authenticated and email verified, show normal content
    return <>{children}</>
} 