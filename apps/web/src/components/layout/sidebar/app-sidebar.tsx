"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    PenTool,
    Calendar,
    BarChart3,
    Plus,
    LogOut,
    Sparkles,
    FileText,
    Link as LinkIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/components/providers/user-provider";
import { authClient } from "@/lib/auth-client";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { H6 } from "@/components/ui/headings";
import DraftsSidebarContainer from "./drafts";

// Navigation items
const navigationItems = [
    {
        title: "Create Post",
        url: "/draft",
        icon: PenTool,
    },
    {
        title: "Automations",
        url: "/automations",
        icon: Calendar,
    },
    {
        title: "Connections",
        url: "/connections",
        icon: LinkIcon,
    },
];

function UserSection() {
    const { user, isLoading } = useUser();
    const { state } = useSidebar();

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-2">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    <ThreeDotLoader size="sm" />
                </div>
                {state === "expanded" && (
                    <div className="flex-1 space-y-1">
                        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
                        <div className="bg-muted h-2 w-16 animate-pulse rounded" />
                    </div>
                )}
            </div>
        );
    }

    if (!user) return null;

    const userInitials = user.name
        ? user.name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase()
        : user.email[0].toUpperCase();

    return (
        <div className="flex items-center gap-3 p-2">
            <Avatar className="size-8 shrink-0">
                <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || "User"}
                />
                <AvatarFallback className="text-xs font-medium">
                    {userInitials}
                </AvatarFallback>
            </Avatar>

            {state === "expanded" && (
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                            {user.name || "User"}
                        </p>
                        {!user.emailVerified && (
                            <Badge
                                variant="destructive"
                                className="px-1 text-xs"
                            >
                                Unverified
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                        {user.email}
                    </p>
                </div>
            )}
        </div>
    );
}

function QuickActions() {
    const { state } = useSidebar();

    if (state === "collapsed") {
        return (
            <SidebarMenuButton asChild tooltip="Create New Post">
                <Link
                    href="/draft"
                    className={cn(
                        buttonVariants({ variant: "default" }),
                        "hover:bg-primary! hover:text-primary-foreground! w-full",
                    )}
                >
                    <Plus className="size-5!" />
                </Link>
            </SidebarMenuButton>
        );
    }

    return (
        <SidebarMenuButton
            className="w-full truncate overflow-hidden px-2 py-5! text-sm whitespace-nowrap"
            asChild
        >
            <Link
                href="/draft"
                className={cn(
                    buttonVariants({ variant: "default" }),
                    "hover:bg-primary! hover:text-primary-foreground! w-full",
                )}
            >
                <Plus className="-ml-5 size-5!" />
                <span className="mb-1">Create Post</span>
            </Link>
        </SidebarMenuButton>
    );
}

export function AppSidebar({
    className,
    ...props
}: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { refreshUser } = useUser();
    const { state } = useSidebar();
    const handleSignOut = async () => {
        await authClient.signOut();
        await refreshUser();
    };

    return (
        <Sidebar
            variant="inset"
            collapsible="icon"
            className={cn("scroll-bar sticky top-0 h-screen", className)}
            {...props}
        >
            {/* Header */}
            <SidebarHeader className="border-sidebar-border border-b">
                <div className="flex items-center gap-2 py-2">
                    <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Sparkles className="size-4" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                        <H6 className="text-foreground font-bold">PostCribe</H6>
                        <p className="text-muted-foreground text-xs">
                            AI Social Media
                        </p>
                    </div>
                </div>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent className="scroll-bar overflow-x-hidden">
                {/* Quick Actions */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <QuickActions />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu
                            className={cn(state === "collapsed" && "gap-3")}
                        >
                            {navigationItems.map(item => {
                                const isActive = pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                            className="truncate overflow-hidden px-2 py-5! text-sm whitespace-nowrap"
                                        >
                                            <Link href={item.url}>
                                                <item.icon className="size-5!" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                {/* Drafts */}
                {state === "expanded" && (
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-md mb-2 flex items-center gap-2">
                            <FileText className="size-4" />
                            <span>Drafts</span>
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="ml-2 border-l px-2">
                            <SidebarMenu>
                                <DraftsSidebarContainer />
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-sidebar-border border-t">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserSection />
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            tooltip="Sign Out"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                        >
                            <LogOut className="size-4" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
