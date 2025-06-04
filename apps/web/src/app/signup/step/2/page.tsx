"use client"

import { GalleryVerticalEnd, ArrowLeft } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CLIENT_URL } from "@/config"
import { DateTime } from "luxon"

// Schema for step 2 - name and timezone
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  timeZone: z.string().min(1, "Please select a timezone."),
})

type ProfileFormData = z.infer<typeof formSchema>

// Get common timezones using Luxon
const getCommonTimezones = () => {
  const commonZones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
  ]

  return commonZones.map(zone => {
    const dt = DateTime.now().setZone(zone)
    return {
      value: zone,
      label: `${zone.replace('_', ' ')} (${dt.toFormat('ZZZZ')})`,
      offset: dt.toFormat('ZZ')
    }
  }).sort((a, b) => a.offset.localeCompare(b.offset))
}

export default function SignupStepTwoPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [fetchingUser, setFetchingUser] = useState(true)

  const timezones = getCommonTimezones()
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const form = useForm<ProfileFormData>({
    // @ts-expect-error - zodResolver is not typed correctly
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      timeZone: userTimezone,
    },
  })

  // Fetch user data on component mount
  useEffect(() => {
    async function fetchUser() {
      setFetchingUser(true)
      try {
        const session = await authClient.getSession()
        if (session.data?.user) {
          setUser(session.data.user)
          // Pre-populate form with existing data
          form.setValue("name", session.data.user.name || "")
          form.setValue("timeZone", session.data.user.timeZone || userTimezone)
        } else {
          // No session, redirect to step 1
          router.push("/signup")
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        setError("Failed to load user data")
        router.push("/signup")
      } finally {
        setFetchingUser(false)
      }
    }

    fetchUser()
  }, [router, form, userTimezone])

  async function onSubmit(values: ProfileFormData) {
    setIsLoading(true)
    setError("")

    try {
      // Update user profile with name and timezone
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          timeZone: values.timeZone,
        }),
      })

      if (response.ok) {
        // Profile updated successfully, redirect to dashboard
        router.push(`${CLIENT_URL}/dashboard`)
      } else {
        setError("Failed to update profile. Please try again.")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
      console.error("Profile update error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (fetchingUser) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <ThreeDotLoader />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          PostCribe
        </a>

        <div className="flex flex-col gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-border/30 hover:bg-card/90 transition-all duration-200">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/signup")}
                  className="p-1 h-auto"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Back</span>
              </div>
              <CardTitle className="text-foreground">Complete your profile</CardTitle>
              <CardDescription className="text-muted-foreground">
                Step 2 of 2: Tell us about yourself
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name<span className="text-destructive ml-1">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            className="transition-all duration-200 focus-visible:shadow-lg"
                          />
                        </FormControl>
                        <FormDescription>
                          This is how we'll address you in PostCribe
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone<span className="text-destructive ml-1">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="transition-all duration-200 focus-visible:shadow-lg">
                              <SelectValue placeholder="Select your timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezones.map((timezone) => (
                              <SelectItem key={timezone.value} value={timezone.value}>
                                {timezone.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Used for scheduling your posts at the right time
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <ThreeDotLoader />
                        Completing setup...
                      </div>
                    ) : (
                      "Complete Setup"
                    )}
                  </Button>
                </form>
              </Form>

              {user && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Signed in as: <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-muted-foreground text-center text-xs">
            By completing setup, you agree to our{" "}
            <a href="#" className="hover:text-primary underline underline-offset-4">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="hover:text-primary underline underline-offset-4">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  )
} 