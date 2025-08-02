import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/providers";
import { Toaster } from "sonner";
import { LoginChecker } from "@/components/ui/login-checker";
import { StagewiseToolbar } from "@stagewise/toolbar-next";
import ReactPlugin from "@stagewise-plugins/react";

export const metadata: Metadata = {
    title: "Postcribe",
    description:
        "Postcribe is a platform for creating and scheduling social media posts.",
    viewport:
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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
                    {/* <StagewiseToolbar
                        config={{
                            plugins: [ReactPlugin],
                        }}
                    /> */}
                </Providers>
            </body>
        </html>
    );
}
