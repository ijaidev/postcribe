"use client";

import { GalleryVerticalEnd, CheckCircle, AlertTriangle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResendVerificationEmail } from "@/components/ui/resend-verification-email";
import { useUser } from "@/components/providers/user-provider";
import { z } from "zod";
import Link from "next/link";
import { cn } from "@/lib/utils";

function VerifyEmailContent() {
    const { refreshUser, user, isLoading } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const emailParam = searchParams.get("mail");
    const token = searchParams.get("token");

    const emailSchema = z.string().email();
    const parsedEmail = emailSchema.safeParse(emailParam);
    const email = parsedEmail.data;

    useEffect(() => {
        const verifyEmail = async () => {
            if (isLoading) return;

            if (user && user.emailVerified) {
                setSuccess(true);
                return;
            }

            if (!email || !token) {
                setError("No email found. Please check your email link.");
                return;
            }

            try {
                setIsVerifying(true);
                const { error, data } = await authClient.verifyEmail({
                    query: {
                        token: token,
                    },
                });

                if (error || !data?.status) {
                    if (
                        error?.code === "INVALID_TOKEN" ||
                        error?.code === "TOKEN_EXPIRED"
                    ) {
                        setError(
                            "This verification link is invalid or has expired. Please request a new verification email.",
                        );
                    } else {
                        setError(
                            error?.message ||
                                "Failed to verify email. Please try again.",
                        );
                    }
                    setSuccess(false);
                } else {
                    await refreshUser();
                    setSuccess(true);
                }
            } catch (err) {
                console.error("Email verification error:", err);
                setError(
                    "Something went wrong during email verification. Please try again.",
                );
            } finally {
                setIsVerifying(false);
            }
        };

        verifyEmail();
    }, [router, searchParams, user, refreshUser, email, token, isLoading]);

    if (isLoading || isVerifying) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="flex w-full max-w-sm flex-col gap-6">
                    <a
                        href="#"
                        className="flex items-center gap-2 self-center font-medium"
                    >
                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <GalleryVerticalEnd className="size-4" />
                        </div>
                        PostCribe
                    </a>

                    <Card className="bg-card/80 border-border/30 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <ThreeDotLoader size="lg" />

                                <div>
                                    <h2 className="text-foreground text-lg font-semibold">
                                        {isVerifying
                                            ? "Verifying your email..."
                                            : "Loading..."}
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {isVerifying
                                            ? "Please wait while we verify your email address."
                                            : "Please wait."}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <a
                    href="#"
                    className="flex items-center gap-2 self-center font-medium"
                >
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    PostCribe
                </a>

                <div className="flex flex-col gap-6">
                    <Card className="bg-card/80 border-border/30 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="mb-2 flex justify-center">
                                {success ? (
                                    <CheckCircle className="size-12 text-green-500" />
                                ) : (
                                    <AlertTriangle className="text-destructive size-12" />
                                )}
                            </div>
                            <CardTitle className="text-foreground">
                                {success
                                    ? "Email Verified!"
                                    : "Verification Failed"}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                {success
                                    ? "Your email has been successfully verified."
                                    : "We couldn't verify your email address."}
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
                                            You&apos;ll be redirected to your
                                            dashboard in a moment.
                                        </AlertDescription>
                                    </Alert>

                                    <Link
                                        href="/draft"
                                        className={cn(
                                            buttonVariants(),
                                            "w-full",
                                        )}
                                    >
                                        Go to Dashboard
                                    </Link>
                                </div>
                            ) : (
                                <ResendVerificationEmail email={email!} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-svh items-center justify-center p-6">
                    <ThreeDotLoader size="lg" />
                </div>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
