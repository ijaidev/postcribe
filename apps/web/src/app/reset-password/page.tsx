"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Key, AlertTriangle, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Subtitle } from "@/components/ui/headings";
import { authClient } from "@/lib/auth-client";
import { useUser } from "@/components/providers/user-provider";

// Form schemas
const emailSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type EmailFormData = z.infer<typeof emailSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const { user, isLoading: userLoading } = useUser();

    const [isLoading, setIsLoading] = useState({
        sendEmail: false,
        resetPassword: false,
    });
    const [resetError, setResetError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    // Email form for sending reset link
    const emailForm = useForm<EmailFormData>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            email: "",
        },
    });

    // Password reset form for when token is present
    const resetForm = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Auto-fill email if user is logged in
    useEffect(() => {
        if (user?.email) {
            emailForm.setValue("email", user.email);
        }
    }, [user, emailForm]);

    // Cooldown timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (cooldownSeconds > 0) {
            interval = setInterval(() => {
                setCooldownSeconds(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldownSeconds]);

    // Start cooldown timer
    const startCooldown = () => {
        setCooldownSeconds(60);
    };

    // Send reset email
    const onSendResetEmail = async (data: EmailFormData) => {
        setIsLoading(prev => ({ ...prev, sendEmail: true }));

        try {
            const { data: response, error } = await authClient.forgetPassword({
                email: data.email,
            });

            if (error || !response?.status) {
                const errorMessage =
                    error?.message || "Failed to send reset email";
                toast.error(errorMessage);
            } else {
                setEmailSent(true);
                startCooldown();
                toast.success("Reset link sent! Check your email.");
            }
        } catch {
            const errorMessage =
                "Network error. Please check your connection and try again.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(prev => ({ ...prev, sendEmail: false }));
        }
    };

    // Reset password with token
    const onResetPassword = async (data: ResetPasswordFormData) => {
        if (!token) return;

        setIsLoading(prev => ({ ...prev, resetPassword: true }));
        setResetError(null);

        try {
            const response = await authClient.resetPassword({
                newPassword: data.newPassword,
                token,
            });

            if (response.error || !response.data.status) {
                if (
                    response.error?.code === "INVALID_TOKEN" ||
                    response.error?.code === "TOKEN_EXPIRED"
                ) {
                    setResetError(
                        "The reset link has expired or is invalid. Please request a new one.",
                    );
                } else {
                    setResetError(
                        response.error?.message ||
                            "Failed to reset password. Please try again.",
                    );
                }
            } else {
                toast.success(
                    "Password reset successfully! You can now sign in.",
                );
                router.push("/signin");
            }
        } catch {
            setResetError(
                "Network error. Please check your connection and try again. If the problem persists, the reset link may have expired.",
            );
        } finally {
            setIsLoading(prev => ({ ...prev, resetPassword: false }));
        }
    };

    // Show loading state while checking user
    if (userLoading) {
        return (
            <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
                <div className="flex flex-col items-center gap-4">
                    <ThreeDotLoader size="lg" />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Reset password form (when token is present)
    if (token) {
        return (
            <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="flex flex-col items-center justify-center space-y-3 text-center">
                        <Subtitle className="text-muted-foreground mx-auto max-w-xl">
                            Enter your new password below
                        </Subtitle>
                    </div>

                    <Card className="bg-card border-0 shadow-lg backdrop-blur-sm">
                        <CardContent className="space-y-4 pt-6">
                            {/* Error Alert */}
                            {resetError && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {resetError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Form {...resetForm}>
                                <form
                                    onSubmit={resetForm.handleSubmit(
                                        onResetPassword,
                                    )}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={resetForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium">
                                                    New Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter your new password"
                                                        className="bg-background/50 focus:bg-background h-12 border-2 text-base transition-all duration-200"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={resetForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium">
                                                    Confirm New Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Confirm your new password"
                                                        className="bg-background/50 focus:bg-background h-12 border-2 text-base transition-all duration-200"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button
                                        type="submit"
                                        disabled={isLoading.resetPassword}
                                        size="lg"
                                        className="w-full font-medium"
                                    >
                                        {isLoading.resetPassword ? (
                                            <ThreeDotLoader size="sm" />
                                        ) : (
                                            <>
                                                <Key className="mr-2 h-4 w-4" />
                                                Reset Password
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Form>

                            {/* Resend Section - Only show if there was an error */}
                            {resetError && (
                                <Button
                                    onClick={() => {
                                        router.push("/reset-password");
                                    }}
                                    type="submit"
                                    disabled={
                                        isLoading.sendEmail ||
                                        cooldownSeconds > 0
                                    }
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send New Reset Link
                                </Button>
                            )}

                            <div className="pt-2 text-center">
                                <Link
                                    href="/signin"
                                    className="text-muted-foreground hover:text-primary text-sm transition-colors"
                                >
                                    <ArrowLeft className="mr-1 inline h-3 w-3" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Email input form (default state - no token)
    return (
        <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="space-y-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <div className="bg-primary/10 ring-primary/5 rounded-full p-3 ring-8">
                            <Mail className="text-primary h-8 w-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Subtitle className="text-muted-foreground">
                            Enter your email address and we&apos;ll send you a
                            link to reset your password
                        </Subtitle>
                    </div>
                </div>

                {/* Form Card */}
                <Card className="bg-card/60 border-0 shadow-xl backdrop-blur-md">
                    <CardContent className="p-8">
                        <Form {...emailForm}>
                            <form
                                onSubmit={emailForm.handleSubmit(
                                    onSendResetEmail,
                                )}
                                className="space-y-6"
                            >
                                <FormField
                                    control={emailForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 text-base font-medium">
                                                <Mail className="h-4 w-4" />
                                                Email Address
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="Enter your email address"
                                                    className="bg-background focus:border-primary/50 focus:ring-primary/20 h-14 border-2 text-base transition-all duration-200 focus:ring-2"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={
                                        isLoading.sendEmail ||
                                        cooldownSeconds > 0
                                    }
                                    size="lg"
                                    className="h-14 w-full text-base font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isLoading.sendEmail ? (
                                        <ThreeDotLoader size="sm" />
                                    ) : cooldownSeconds > 0 ? (
                                        <>
                                            <Clock className="mr-2 h-5 w-5 animate-spin duration-1000" />
                                            Send again in {cooldownSeconds}s
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-5 w-5" />
                                            Send Reset Link
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <div className="mt-4 text-center">
                        <Link
                            href="/signin"
                            className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors duration-200 hover:underline"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </Card>

                {/* Helper text */}
                {user?.email && !emailSent && (
                    <div className="text-center">
                        <p className="text-muted-foreground text-sm">
                            Signed in as{" "}
                            <span className="text-foreground font-medium">
                                {user.email}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
