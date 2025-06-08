import { Toaster } from "sonner"
import ThemeProvider from "./theme-provider"
import { UserProvider } from "./user-provider"
import { LoginChecker } from "../ui/login-checker"

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <Toaster />
            <UserProvider>
                <LoginChecker />
                {children}
            </UserProvider>
        </ThemeProvider>
    )
}