"use client"

import { GalleryVerticalEnd } from "lucide-react"
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
  FormMessage
} from "@/components/ui/form"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

type SignupFormData = z.infer<typeof formSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const redirect = useSearchParams().get("redirect")

  const form = useForm<SignupFormData>({
    // @ts-expect-error - zodResolver is not typed correctly
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  function onSubmit(values: SignupFormData) {
    setIsLoading(true)
    setError("")

    authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).then((res) => {
      if (res.error) {
        setError(res.error.message || "Failed to create account")
      } else {
        router.push(redirect || "/dashboard")
      }
    }).catch((err) => {
      setError("Something went wrong. Please try again.")
      console.error("Signup error:", err)
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError("")

    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirect || "/dashboard",
      })
      console.log(res)

      if (res.error) {
        setError(res.error.message || "Failed to sign up with Google")
        setIsLoading(false)
      }
    } catch (err) {
      setError("Failed to sign up with Google")
      setIsLoading(false)
      console.error("Google signup error:", err)
    }
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
              <CardTitle className="text-foreground">Create your account</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign up to start creating amazing social media posts
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="grid gap-6">
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full transition-all duration-200 hover:bg-accent/50 hover:shadow-lg"
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-2 animate-dots"
                          style={{
                            background: `
                              radial-gradient(circle closest-side, currentColor 90%, transparent) 0% 50%,
                              radial-gradient(circle closest-side, currentColor 90%, transparent) 50% 50%,
                              radial-gradient(circle closest-side, currentColor 90%, transparent) 100% 50%
                            `,
                            backgroundSize: 'calc(100%/3) 50%',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                        Loading...
                      </div>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>

                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with email
                  </span>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name<span className="text-destructive ml-1">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email<span className="text-destructive ml-1">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="m@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password<span className="text-destructive ml-1">*</span></FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a strong password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary underline-offset-4 hover:underline font-medium">
                    Sign in
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-muted-foreground text-center text-xs">
            By creating an account, you agree to our{" "}
            <a href="#" className="hover:text-primary underline underline-offset-4">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="hover:text-primary underline underline-offset-4">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  )
}
