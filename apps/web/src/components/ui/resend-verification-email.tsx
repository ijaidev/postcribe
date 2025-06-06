"use client"

import { useState, useEffect } from "react"
import { Mail, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

interface ResendVerificationEmailProps {
  /** The email address to send verification to (required) */
  email: string
  /** URL to redirect to after verification completion */
  callbackURL?: string
  /** Button variant style */
  variant?: "default" | "outline" | "ghost"
  /** Button size */
  size?: "sm" | "default" | "lg"
  /** Additional CSS classes */
  className?: string
  /** Whether to show the helper text above the button */
  showHelper?: boolean
  /** Custom helper text (default: "Didn't receive the email?") */
  helperText?: string
  /** Callback fired when email is successfully sent */
  onSuccess?: () => void
  /** Callback fired when email sending fails */
  onError?: (error: any) => void
}

export function ResendVerificationEmail({
  email,
  callbackURL,
  variant = "outline",
  size = "sm",
  className = "",
  showHelper = true,
  helperText = "Didn't receive the email?",
  onSuccess,
  onError,
}: ResendVerificationEmailProps) {
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const handleResendEmail = async () => {
    if (isResending || cooldown > 0 || !email) return

    setIsResending(true)

    try {
      await authClient.sendVerificationEmail({
        email,
        ...(callbackURL && { callbackURL }),
      })

      toast.success("Verification email sent!", {
        description: "Please check your email and click the verification link.",
        icon: <Mail className="h-4 w-4" />,
      })

      // Start 1-minute cooldown
      setCooldown(60)
      onSuccess?.()

    } catch (err: any) {
      const errorMessage = err.message || "Something went wrong. Please try again."
      
      toast.error("Failed to send verification email", {
        description: errorMessage,
      })
      
      onError?.(err)
    } finally {
      setIsResending(false)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [cooldown])

  if (!email) return null

  return (
    <div className={`bg-muted/50 rounded-lg p-4 space-y-3 border border-border ${className}`}>
      {showHelper && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{helperText}</span>
        </div>
      )}
      
      <Button
        type="button"
        variant={variant}
        size={size}
        className="w-full transition-all duration-200"
        disabled={isResending || cooldown > 0}
        onClick={handleResendEmail}
      >
        {isResending ? (
          <div className="flex items-center gap-2">
            <span>Sending</span>
            <ThreeDotLoader size="sm" />
          </div>
        ) : cooldown > 0 ? (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin [animation-duration:5s]" />
            <span>Resend in {cooldown}s</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Resend verification email</span>
          </div>
        )}
      </Button>
    </div>
  )
} 