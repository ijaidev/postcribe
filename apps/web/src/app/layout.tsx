import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/providers";


export const metadata: Metadata = {
  title: "PostCribe",
  description: "PostCribe is a platform for creating and scheduling social media posts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
