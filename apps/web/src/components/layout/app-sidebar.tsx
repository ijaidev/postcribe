"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  PenTool,
  Calendar,
  Settings,
  Users,
  BarChart3,
  Plus,
  LogOut,
  Bell,
  Sparkles
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/user-provider"
import { authClient } from "@/lib/auth-client"
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
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { XLogo } from "@/components/ui/x-logo"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { H6 } from "@/components/ui/headings"

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Create Post",
    url: "/create",
    icon: PenTool,
  },
  {
    title: "Scheduled Posts",
    url: "/scheduled",
    icon: Calendar,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Users,
  },
]

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
]

function UserSection() {
  const { user, isLoading } = useUser()
  const { state } = useSidebar()

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <ThreeDotLoader size="sm" />
        </div>
        {state === "expanded" && (
          <div className="flex-1 space-y-1">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-2 w-16 rounded bg-muted animate-pulse" />
          </div>
        )}
      </div>
    )
  }

  if (!user) return null

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <div className="flex items-center gap-3 p-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
        <AvatarFallback className="text-xs font-medium">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      
      {state === "expanded" && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {user.name || "User"}
            </p>
            {!user.emailVerified && (
              <Badge variant="destructive" className="text-xs px-1">
                Unverified
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      )}
    </div>
  )
}

function QuickActions() {
  const { state } = useSidebar()

  if (state === "collapsed") {
    return (
      <SidebarMenuButton asChild tooltip="Create New Post">
        <Link href="/create">
          <Plus className="size-4" />
        </Link>
      </SidebarMenuButton>
    )
  }

  return (
    <Button asChild size="sm" className="w-full">
      <Link href="/create">
        <Plus className="size-4" />
        Create Post
      </Link>
    </Button>
  )
}

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { refreshUser } = useUser()

  const handleSignOut = async () => {
    await authClient.signOut()
    await refreshUser()
  }

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className={cn("top-0 h-screen sticky", className)}
      {...props}
    >
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <H6 className="font-bold text-foreground">PostCribe</H6>
            <p className="text-xs text-muted-foreground">AI Social Media</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Social Platforms */}
        <SidebarGroup>
          <SidebarGroupLabel>Platforms</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Twitter/X">
                  <Link href="/connections?platform=x">
                    <XLogo size="sm" />
                    <span>Twitter/X</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="LinkedIn">
                  <Link href="/connections?platform=linkedin">
                    <div className="size-4 rounded bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">in</span>
                    </div>
                    <span>LinkedIn</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserSection />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign Out"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
