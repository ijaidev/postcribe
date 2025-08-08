import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
    title: "Postcribe",
    description:
        "Postcribe is a platform for creating and scheduling social media posts.",
    other: {
        "apple-mobile-web-app-title": "Postcribe",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
