import Link from "next/link";

export default function Home() {
    return (
        <div>
            <Link href="/signin">Sign in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/reset-password">Reset password</Link>
            <Link href="/verify-email">Verify email</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/logout">Logout</Link>
        </div>
    );
}
