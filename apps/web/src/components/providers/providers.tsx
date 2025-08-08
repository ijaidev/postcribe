"use client";

import { Suspense } from "react";
import { LoginChecker } from "../ui/login-checker";
import ThemeProvider from "./theme-provider";
import { UserProvider } from "./user-provider";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <UserProvider>
                    <Suspense fallback={null}>
                        <LoginChecker />
                    </Suspense>
                    {children}
                </UserProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
