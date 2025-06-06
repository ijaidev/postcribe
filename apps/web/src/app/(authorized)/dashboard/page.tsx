"use client"

import { authClient } from "@/lib/auth-client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
    const { data, error, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        console.log("data", data)
        console.log("error", error)
        console.log("isPending", isPending)
        if (error || (!isPending && !data)) {
            router.push(`/signin`)
        }
    }, [data, error, isPending])

    if (isPending) {
        return <div>Loading...</div>
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome {data?.user?.name}</p>
            <p>Email: {data?.user?.email}</p>
            <p>ID: {data?.user?.id}</p>
            <p>Session: {JSON.stringify(data?.user)}</p>
        </div>
    )
}