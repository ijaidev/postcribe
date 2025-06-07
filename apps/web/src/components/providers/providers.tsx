import ThemeProvider from "./theme-provider"
import { UserProvider } from "./user-provider"

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <UserProvider>
                {children}
            </UserProvider>
        </ThemeProvider>
    )
}