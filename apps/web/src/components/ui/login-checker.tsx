"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { CLIENT_URL } from "@/config";
import { ThreeDotLoader } from "@/components/ui/loaders/three-dot-loader";
import { useUser } from "@/components/providers/user-provider";
import { ResendVerificationEmail } from "./resend-verification-email";

const authRoutes = ["/signin", "/signup"];
const publicRoutes = ["/", "/reset-password", "/verify-email"];

export function LoginChecker() {
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();
    const {
        user,
        isLoading,
        isAuthenticated,
        emailVerified,
        error,
        refreshUser,
    } = useUser();
    const searchParams = useSearchParams();

    const pathname = usePathname();

    const isAuthRoute = authRoutes.includes(pathname);
    const isPublicRoute = publicRoutes.includes(pathname);

    useEffect(() => {
        const checkAuth = async () => {
            if (isPublicRoute) return;
            if (isLoading || error) return;
            const redirect = searchParams.get("redirect");
            if (isAuthRoute) {
                if (!isAuthenticated) return;
                router.push(redirect ? redirect : CLIENT_URL + "/dashboard");
            }
            if (!isAuthenticated)
                router.push(
                    CLIENT_URL + "/signin?redirect=" + CLIENT_URL + pathname,
                );
        };
        checkAuth();
        setIsChecking(false);
    }, [
        user,
        isAuthenticated,
        isLoading,
        pathname,
        isPublicRoute,
        error,
        searchParams,
        isAuthRoute,
        router,
    ]);

    useLayoutEffect(() => {
        setIsChecking(true);
    }, [pathname]);

    if (isPublicRoute) {
        return null;
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex min-h-svh items-center justify-center bg-background">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                            <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-xl">Error</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>

                        <div className="flex gap-2 pt-2">
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                Try again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if ((!isAuthRoute && !user) || (user && isAuthRoute) || isChecking) {
        return (
            <div className="fixed inset-0 z-50 flex min-h-svh items-center justify-center overflow-hidden bg-background">
                <ThreeDotLoader size="lg" />
            </div>
        );
    }

    // If authenticated but email not verified, show overlay
    if (isAuthenticated && !emailVerified) {
        return (
            <>
                {/* Email verification modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background">
                    <div className="w-full max-w-md">
                        <Card>
                            <CardHeader className="text-center">
                                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                                    <Mail className="size-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <CardTitle className="text-xl">
                                    Verify your email
                                </CardTitle>
                                <CardDescription>
                                    Please verify your email address to continue
                                    using PostCribe
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Your email address{" "}
                                        <strong>{user?.email}</strong> needs to
                                        be verified before you can access the
                                        dashboard.
                                    </AlertDescription>
                                </Alert>

                                {user?.email && (
                                    <ResendVerificationEmail
                                        email={user.email}
                                        size="lg"
                                        helperText="If you haven't received the email, you can resend it."
                                    />
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={async () => {
                                            await authClient.signOut();
                                            await refreshUser();
                                        }}
                                    >
                                        Sign out
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={() => {
                                            // Refresh auth status
                                            refreshUser();
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
        );
    }

    return null;
}
