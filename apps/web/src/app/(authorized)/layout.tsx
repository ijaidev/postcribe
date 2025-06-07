import { LoginChecker } from "@/components/ui/login-checker";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <LoginChecker>{children}</LoginChecker>
    )
}
