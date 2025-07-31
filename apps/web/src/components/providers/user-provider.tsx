"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";

interface User {
    id: string;
    email: string;
    name?: string | null;
    timeZone?: string | null;
    emailVerified: boolean;
    image?: string | null;
    credits: number;
}

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    emailVerified: boolean;
    error: string | null;
    refreshUser: (options?: { disableCookieCache?: boolean }) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshUser = async ({
        disableCookieCache = false,
    }: {
        disableCookieCache?: boolean;
    } = {}) => {
        try {
            setIsLoading(true);
            setError(null);

            const query = disableCookieCache ? { disableCookieCache } : {};

            const { data: session, error: sessionError } =
                await authClient.getSession({
                    query,
                });

            if (sessionError) {
                throw new Error(
                    sessionError.message ||
                        "Something went wrong. Please try again.",
                );
            }

            if (!session) {
                // Not authenticated
                setIsAuthenticated(false);
                setUser(null);
                setEmailVerified(false);
            } else {
                // Authenticated
                setIsAuthenticated(true);
                setUser({
                    ...session.user,
                    credits: session.user.credits || 0,
                });
                setEmailVerified(session.user.emailVerified || false);
            }
        } catch (err) {
            console.error("Auth check error:", err);
            setIsAuthenticated(false);
            setUser(null);
            setEmailVerified(false);
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const value: UserContextType = {
        user,
        isLoading,
        isAuthenticated,
        emailVerified,
        error,
        refreshUser,
    };

    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
