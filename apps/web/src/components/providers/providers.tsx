
import { LoginChecker } from "../ui/login-checker"
import ThemeProvider from "./theme-provider"
import { UserProvider } from "./user-provider"

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <UserProvider>
                <LoginChecker />
                {children}
            </UserProvider>
        </ThemeProvider>
    )
}