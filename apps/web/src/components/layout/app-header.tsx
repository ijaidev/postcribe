"use client";

import * as React from "react";
import { Settings, LogOut } from "lucide-react";

import { useUser } from "@/components/providers/user-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ThemeButton } from "@/components/ui/theme-button";

export function AppHeader() {
    const { user, isAuthenticated, emailVerified, refreshUser } = useUser();
    const router = useRouter();
    const [open, setOpen] = React.useState(false);

    const handleSignOut = async () => {
        try {
            await authClient.signOut();
            await refreshUser();
            toast.success("Signed out successfully!");
            router.push("/signin");
        } catch (error) {
            toast.error("Failed to sign out");
            console.error("Sign out error:", error);
        } finally {
            setOpen(false);
        }
    };

    const getUserInitials = (name?: string | null, email?: string) => {
        if (name) {
            return name
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        return email ? email[0].toUpperCase() : "U";
    };

    return (
        <header className="bg-sidebar sticky top-0 z-40 w-full">
            <div className="relative container flex h-16 items-center px-6">
                {/* <div className="h-5 rounded-tl-2xl bg-black absolute top-12 -left-0.5 right-0 z-10 overflow-hidden" /> */}
                {/* Left side - Sidebar trigger */}
                <div className="mr-4 flex">
                    <SidebarTrigger />
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right side - Theme toggle and User avatar */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <ThemeButton />

                    {/* User avatar with popover */}
                    {isAuthenticated && user ? (
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative size-8 rounded-full p-0"
                                >
                                    <Avatar className="size-8">
                                        <AvatarImage
                                            src={user.image || undefined}
                                            alt={user.name || "User"}
                                        />
                                        <AvatarFallback className="text-xs">
                                            {getUserInitials(
                                                user.name,
                                                user.email,
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="bg-popover/70 w-80 backdrop-blur-sm"
                                align="end"
                                sideOffset={8}
                            >
                                <div className="space-y-4">
                                    {/* User info */}
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-12">
                                            <AvatarImage
                                                src={user.image || undefined}
                                                alt={user.name || "User"}
                                            />
                                            <AvatarFallback>
                                                {getUserInitials(
                                                    user.name,
                                                    user.email,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-2">
                                            <h4 className="text-sm font-semibold">
                                                {user.name || "User"}
                                            </h4>
                                            <p className="text-muted-foreground text-xs">
                                                {user.email}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        emailVerified
                                                            ? "default"
                                                            : "destructive"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {emailVerified
                                                        ? "Verified"
                                                        : "Unverified"}
                                                </Badge>
                                                {user.timeZone && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {user.timeZone}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Actions */}
                                    <div className="space-y-1">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-2 text-sm"
                                            onClick={() => {
                                                router.push("/settings");
                                                setOpen(false);
                                            }}
                                        >
                                            <Settings className="size-4" />
                                            Settings
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                            onClick={handleSignOut}
                                        >
                                            <LogOut className="size-4" />
                                            Sign out
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        /* Not authenticated - show sign in button */
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/signin")}
                        >
                            Sign in
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
