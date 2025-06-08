"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { User as UserIcon, Key, Save, LogOut, Shield, Clock, Mail, Settings, Link2, Plus, Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { H1 } from "@/components/ui/headings"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { authClient } from "@/lib/auth-client"
import TimezoneSelect from "@/components/ui/timezone"
import { CLIENT_URL } from "@/config"
import Link from "next/link"
import { useUser } from "@/components/providers/user-provider"

// Form schemas
const profileSchema = z.object({
  name: z.string().max(50, "Name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  timeZone: z.string().min(1, "Please select a timezone"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

type ConnectedAccount = {
  id: string
  provider: string
  accountId: string
  createdAt: Date
  updatedAt: Date
  scopes: string[]
}

export default function SettingsPage() {
  const { user, refreshUser } = useUser()
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [accountToUnlink, setAccountToUnlink] = useState<{ provider: string; accountId: string } | null>(null)
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  const [isLoading, setIsLoading] = useState({
    profile: false,
    password: false,
    accounts: false,
    unlinkAccount: false,
    signOut: false,
  })



  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      timeZone: "",
    },
  })

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Watch form values for changes
  const watchedValues = profileForm.watch()

  // Check if profile data has changed
  const hasProfileChanged = watchedValues.name !== (user?.name || "") || watchedValues.timeZone !== (user?.timeZone || "")

  // Load connected accounts
  const loadConnectedAccounts = async () => {
    try {
      setIsLoading(prev => ({ ...prev, accounts: true }))
      const accounts = await authClient.listAccounts()
      // Handle the response - it might be wrapped or direct
      if (Array.isArray(accounts)) {
        setConnectedAccounts(accounts as ConnectedAccount[])
      } else if (accounts && 'data' in accounts && Array.isArray(accounts.data)) {
        setConnectedAccounts(accounts.data as ConnectedAccount[])
      } else {
        setConnectedAccounts([])
      }
    } catch {
      console.error("Failed to load connected accounts")
      toast.error("Failed to load connected accounts")
      setConnectedAccounts([])
    } finally {
      setIsLoading(prev => ({ ...prev, accounts: false }))
    }
  }

  // Link Google account
  const handleLinkGoogle = async () => {
    try {
      const res = await authClient.linkSocial({
        provider: "google",
        callbackURL: CLIENT_URL + "/settings"
      })
      if (res.error || !res.data) {
        toast.error(res.error?.message || "Failed to link Google account")
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
      toast.error(errorMessage)
    }
  }

  // Unlink account
  const handleUnlinkAccount = async () => {
    if (!accountToUnlink) return

    try {
      setIsLoading(prev => ({ ...prev, unlinkAccount: true }))
      const res = await authClient.unlinkAccount({
        providerId: accountToUnlink.provider,
        accountId: accountToUnlink.accountId
      })
      if (res.error) {
        toast.error(res.error.message || "Failed to unlink account")
        return
      }
      toast.success("Account unlinked successfully")
      loadConnectedAccounts() // Refresh the list
    } catch {
      console.error("Failed to unlink account")
      toast.error("Failed to unlink account")
    } finally {
      setIsLoading(prev => ({ ...prev, unlinkAccount: false }))
      setAccountToUnlink(null)
    }
  }

  // Load user data from context
  useEffect(() => {
    if (user) {
      const profileData = {
        name: user.name || "",
        email: user.email || "",
        timeZone: user.timeZone || "",
      }
      profileForm.reset(profileData)
    }
  }, [user, profileForm])

  useEffect(() => {
    loadConnectedAccounts()
  }, [])

  // Update profile
  const onUpdateProfile = async (data: ProfileFormData) => {
    setIsLoading(prev => ({ ...prev, profile: true }))
    try {
      const { error } = await authClient.updateUser({
        name: data.name,
        timeZone: data.timeZone,
        // Note: Email updates might require verification
      })

      if (error) {
        toast.error(error.message || "Failed to update profile")
      } else {
        toast.success("Profile updated successfully")
        // Refresh user data from context
        await refreshUser()
      }
    } catch {
      toast.error("An error occurred while updating your profile")
    } finally {
      setIsLoading(prev => ({ ...prev, profile: false }))
    }
  }

  // Change password
  const onChangePassword = async (data: PasswordFormData) => {
    setIsLoading(prev => ({ ...prev, password: true }))
    try {
      const { error } = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      })

      if (error) {
        toast.error(error.message || "Failed to change password")
      } else {
        toast.success("Password changed successfully")
        passwordForm.reset()
      }
    } catch {
      toast.error("An error occurred while changing your password")
    } finally {
      setIsLoading(prev => ({ ...prev, password: false }))
    }
  }

  // Sign out
  const handleSignOut = async () => {
    try {
      setIsLoading(prev => ({ ...prev, signOut: true }))
      await authClient.signOut()
      refreshUser()
    } catch {
      toast.error("Failed to sign out")
      setIsLoading(prev => ({ ...prev, signOut: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <H1 className="font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Settings
              </H1>
            </div>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Manage your account settings, preferences, and security options
            </p>
          </div>

          {/* Main Settings Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Settings  */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                    <CardDescription className="text-sm">
                      Update your personal information and preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5" />
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              className="h-12 text-base bg-muted/50 border-2 text-muted-foreground"
                            />
                          </FormControl>
                          <FormDescription className="text-xs flex items-center gap-1.5 text-destructive/70">
                            <Shield className="h-3 w-3" />
                            Email cannot be changed from settings for security
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="timeZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Timezone
                          </FormLabel>
                          <FormControl>
                            <TimezoneSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Used for scheduling posts and notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-4" />

                    <Button
                      type="submit"
                      disabled={isLoading.profile || !profileForm.formState.isValid || !hasProfileChanged}
                      size="default"
                      className="w-full h-10 font-medium transition-all duration-200 hover:scale-[1.02]"
                    >
                      {isLoading.profile ? (
                        <ThreeDotLoader size="sm" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Password Settings - Enhanced */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Password & Security</CardTitle>
                    <CardDescription className="text-sm">
                      Update your password to keep your account secure
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your current password"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <Link
                            href={"/reset-password"}
                            className="text-xs font-bold hover:text-primary/80 hover:underline transition-colors duration-200 text-right"
                          >
                            Forgot password?
                          </Link>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your new password"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Must be at least 8 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your new password"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-4" />

                    <Button
                      type="submit"
                      disabled={isLoading.password}
                      size="default"
                      className="w-full h-10 font-medium transition-all duration-200 hover:scale-[1.02]"
                    >
                      {isLoading.password ? (
                        <ThreeDotLoader size="sm" />
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Connected Accounts Section */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Link2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Connected Accounts</CardTitle>
                    <CardDescription className="text-sm">
                      Manage your connected social media accounts
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={handleLinkGoogle}
                  disabled={isLoading.accounts}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLoading.accounts ? (
                    <ThreeDotLoader size="sm" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Link Google
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading.accounts ? (
                <div className="flex items-center justify-center py-8">
                  <ThreeDotLoader size="sm" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
                </div>
              ) : connectedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 rounded-full bg-muted/30 w-fit mx-auto mb-3">
                    <Link2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-sm mb-1">No connected accounts</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Connect your social media accounts to enable posting
                  </p>
                  <Button
                    onClick={handleLinkGoogle}
                    disabled={isLoading.accounts}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isLoading.accounts ? (
                      <ThreeDotLoader size="sm" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Connect Google Account
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/30">
                          {account.provider === 'google' ? (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm capitalize">{account.provider === "credential" ? "Email" : account.provider}</p>
                            <Badge variant="secondary" className="text-xs">
                              Connected
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => setAccountToUnlink({ provider: account.provider, accountId: account.accountId })}
                        disabled={isLoading.unlinkAccount}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {isLoading.unlinkAccount ? (
                          <ThreeDotLoader size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign Out Button */}
          <div className="flex justify-center">
            <Button
              variant="destructive"
              onClick={() => setShowSignOutDialog(true)}
              disabled={isLoading.signOut}
              size="default"
              className="w-full max-w-md h-10 font-medium transition-all duration-200 hover:scale-[1.02]"
            >
              {isLoading.signOut ? (
                <ThreeDotLoader size="sm" />
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out of Account
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Unlink Account Confirmation Dialog */}
      <AlertDialog open={!!accountToUnlink} onOpenChange={(open) => !open && setAccountToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink your {accountToUnlink?.provider === "credential" ? "email" : accountToUnlink?.provider} account?
              This action cannot be undone and you may lose access to certain features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToUnlink(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkAccount}
              disabled={isLoading.unlinkAccount}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isLoading.unlinkAccount ? (
                <ThreeDotLoader size="sm" />
              ) : (
                "Unlink Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSignOutDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={isLoading.signOut}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isLoading.signOut ? (
                <ThreeDotLoader size="sm" />
              ) : (
                "Sign Out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 