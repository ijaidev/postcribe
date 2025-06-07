"use client"

import { useUser } from "@/components/providers/user-provider"

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
        </div>
    )
}