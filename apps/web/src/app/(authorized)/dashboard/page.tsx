"use client"

import { useUser } from "@/components/providers/user-provider"
import Link from "next/link"

export default function DashboardPage() {
    const { user, isLoading } = useUser()

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome {user?.name}</p>
            <p>Email: {user?.email}</p>
            <p>ID: {user?.id}</p>
            <p>Timezone: {user?.timeZone}</p>
            <p>Email Verified: {user?.emailVerified ? 'Yes' : 'No'}</p>

            <Link href="/signin">Sign in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/reset-password">Reset password</Link>
            <Link href="/verify-email">Verify email</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/logout">Logout</Link>
        </div>
    )
}