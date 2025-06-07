"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { User, Key, Save, LogOut, Trash2, Shield, Clock, Mail, Settings } from "lucide-react"
import { DateTime } from "luxon"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { H1 } from "@/components/ui/headings"
import { authClient } from "@/lib/auth-client"

// Form schemas
const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
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

// Get all available timezones using Luxon
const getAllTimezones = () => {
  const zones = Intl.supportedValuesOf('timeZone')
  
  // Create a map of timezone to its formatted display name
  const timezoneOptions = zones.map((zone: string) => {
    try {
      const dt = DateTime.now().setZone(zone)
      const offsetName = dt.toFormat('ZZ')
      
      // Format the display name
      const displayName = zone.replace(/_/g, ' ').split('/').map((part: string) => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' - ')
      
      return {
        value: zone,
        label: `${displayName} (${offsetName})`,
        region: zone.split('/')[0]
      }
    } catch {
      return {
        value: zone,
        label: zone.replace(/_/g, ' '),
        region: zone.split('/')[0]
      }
    }
  }).sort((a: any, b: any) => a.label.localeCompare(b.label))

  // Group by region for better organization
  const grouped = timezoneOptions.reduce((acc: any, tz: any) => {
    const region = tz.region
    if (!acc[region]) acc[region] = []
    acc[region].push(tz)
    return acc
  }, {} as Record<string, typeof timezoneOptions>)

  return { timezoneOptions, grouped }
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [timezones, setTimezones] = useState<{ timezoneOptions: any[], grouped: Record<string, any[]> }>({ timezoneOptions: [], grouped: {} })

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

  // Load timezones on component mount
  useEffect(() => {
    setTimezones(getAllTimezones())
  }, [])

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: session } = await authClient.getSession()
        if (session?.user) {
          setUser(session.user)
          profileForm.reset({
            name: session.user.name || "",
            email: session.user.email || "",
            timeZone: session.user.timeZone || "UTC",
          })
        }
      } catch (error) {
        console.error("Failed to load user data:", error)
        toast.error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [profileForm])

  // Update profile
  const onUpdateProfile = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true)
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
        // Refresh user data
        const { data: session } = await authClient.getSession()
        if (session?.user) {
          setUser(session.user)
        }
      }
    } catch (error) {
      toast.error("An error occurred while updating your profile")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // Change password
  const onChangePassword = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true)
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
    } catch (error) {
      toast.error("An error occurred while changing your password")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Sign out
  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      router.push("/signin")
    } catch (error) {
      toast.error("Failed to sign out")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ThreeDotLoader size="lg" />
          <p className="text-sm text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <H1 className="font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Settings
              </H1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage your account settings, preferences, and security options
            </p>
          </div>

          {/* Main Settings Grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Profile Settings  */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Profile Information</CardTitle>
                    <CardDescription className="text-base">
                      Update your personal information and preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
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
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              className="h-12 text-base bg-muted/50 border-2 text-muted-foreground"
                            />
                          </FormControl>
                          <FormDescription className="text-sm flex items-center gap-2 text-destructive/50">
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
                          <FormLabel className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Timezone
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-base bg-background/50 border-2 focus:bg-background">
                                <SelectValue placeholder="Select your timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-96">
                              {Object.entries(timezones.grouped).map(([region, zones]) => (
                                <div key={region}>
                                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                    {region.charAt(0).toUpperCase() + region.slice(1)}
                                  </div>
                                  {zones.map((tz) => (
                                    <SelectItem key={tz.value} value={tz.value} className="text-base pl-4">
                                      {tz.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-sm">
                            Used for scheduling posts and notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <Button
                      type="submit"
                      disabled={isUpdatingProfile}
                      size="lg"
                      className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                    >
                      {isUpdatingProfile ? (
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
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Password & Security</CardTitle>
                    <CardDescription className="text-base">
                      Update your password to keep your account secure
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your current password"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your new password"
                              className="h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-sm">
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
                          <FormLabel className="text-sm font-semibold">Confirm New Password</FormLabel>
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

                    <Separator className="my-6" />

                    <Button
                      type="submit"
                      disabled={isUpdatingPassword}
                      size="lg"
                      className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                    >
                      {isUpdatingPassword ? (
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

          {/* Sign Out Button */}
          <div className="flex flex-col gap-4 sm:flex-row">

            <Button
              variant="destructive"
              onClick={handleSignOut}
              size="lg"
              className="flex-1 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out of Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 