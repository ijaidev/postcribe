import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/providers";
import { Toaster } from "sonner";
import { LoginChecker } from "@/components/ui/login-checker";

export const metadata: Metadata = {
    title: "PostCribe",
    description:
        "PostCribe is a platform for creating and scheduling social media posts.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>
                    {children}
                    <LoginChecker />
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
