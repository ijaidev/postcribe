"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { InferResponseType } from "hono";
import client from "@/lib/hono-client";

type Data = InferResponseType<typeof client.post.drafts.$get>["data"];
type Draft = NonNullable<Data>["drafts"];

interface DraftContextType {
    drafts: Draft[];
    setDrafts: (drafts: Draft[]) => void;
}

const DraftContext = createContext<DraftContextType | undefined>(undefined);

interface DraftProviderProps {
    children: ReactNode;
}

export function DraftProvider({ children }: DraftProviderProps) {
    const [drafts, setDrafts] = useState<Draft[]>([]);

    const value: DraftContextType = {
        drafts,
        setDrafts,
    };

    return (
        <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
    );
}

export function useDraft() {
    const context = useContext(DraftContext);
    if (!context) {
        throw new Error("useDraft must be used within a DraftProvider");
    }
    return {
        drafts: context.drafts,
        setDrafts: context.setDrafts,
    };
}
