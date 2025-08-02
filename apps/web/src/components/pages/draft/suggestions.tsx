"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import client from "@/lib/hono-client";
import type { SuggestionGenStreamResponse, Suggestions } from "@repo/ai";
import { parse, Allow } from "partial-json";
import { JsonOutputParser } from "@langchain/core/output_parsers";

export default function Suggestions({
    socialLoginId,
    autoLoad = true,
    setPrompt,
}: {
    socialLoginId: string;
    autoLoad?: boolean;
    setPrompt: (prompt: string) => void;
}) {
    const [suggestions, setSuggestions] = useState<Suggestions["suggestions"]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const generateSuggestions = useCallback(
        async (refresh = false) => {
            if (!socialLoginId) return;

            setIsLoading(true);
            setSuggestions([]);

            try {
                const response = await client.post.suggestions.$post({
                    json: {
                        socialLoginId: socialLoginId,
                        refresh,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to generate suggestions");
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error("No response stream available");
                }

                const decoder = new TextDecoder();
                const parser = new JsonOutputParser();

                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunks = decoder.decode(value, { stream: true });
                    const chunksArray = chunks
                        .split("\n")
                        .filter(chunk => chunk.trim() !== "");
                    for (const chunk of chunksArray) {
                        const parsedChunk = (await parser.parse(
                            chunk,
                        )) as SuggestionGenStreamResponse;
                        if (parsedChunk.event !== "response") continue;
                        buffer += parsedChunk.content;
                        const parsed = parse(
                            buffer,
                            Allow.ALL,
                        ) as Partial<Suggestions>;
                        const newSuggestions = parsed.suggestions || [];
                        if (newSuggestions.length === 0) continue;
                        setSuggestions(newSuggestions);
                    }
                }
            } catch (error) {
                console.error("Error generating suggestions:", error);
                toast.error("Failed to generate suggestions");
            } finally {
                setIsLoading(false);
            }
        },
        [socialLoginId],
    );

    // Auto-load suggestions on mount
    useEffect(() => {
        if (autoLoad && socialLoginId) {
            generateSuggestions(false);
        }
    }, [socialLoginId, autoLoad, generateSuggestions]);

    const handleRefresh = () => {
        generateSuggestions(true);
    };

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: -300,
                behavior: "smooth",
            });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                left: 300,
                behavior: "smooth",
            });
        }
    };

    const renderSkeletons = () => {
        return Array.from({ length: 8 }, (_, index) => (
            <Card
                key={`skeleton-${index}`}
                className="bg-muted/30 flex min-h-40 w-90 flex-shrink-0 items-center justify-center border-dashed"
            >
                <CardContent className="flex flex-col items-center justify-center gap-4 p-3">
                    <Skeleton className="h-3 w-80" />
                    <Skeleton className="h-3 w-80" />
                    <Skeleton className="h-3 w-50" />
                </CardContent>
            </Card>
        ));
    };

    const renderSuggestions = () => {
        return suggestions.map((suggestion, index) => (
            <Card
                key={index}
                className="bg-muted/50 hover:bg-muted flex min-h-40 w-72 flex-shrink-0 cursor-pointer items-center justify-center border-0 p-0 shadow-sm transition-all hover:shadow-md sm:w-80 md:w-96"
                onClick={() => setPrompt(suggestion)}
            >
                <CardContent className="flex items-center justify-center px-3 py-2 sm:px-4">
                    <p className="max-w-full text-center text-xs leading-relaxed font-medium whitespace-pre-wrap sm:text-sm">
                        {suggestion}
                    </p>
                </CardContent>
            </Card>
        ));
    };

    return (
        <div className="w-full space-y-3 overflow-hidden">
            <div className="relative flex flex-col items-center gap-3 overflow-hidden">
                <div
                    ref={scrollContainerRef}
                    className="flex w-full max-w-[70vw] gap-2 overflow-x-auto px-2 sm:gap-3 sm:px-0"
                    style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        scrollBehavior: "smooth",
                    }}
                >
                    {suggestions.length === 0
                        ? renderSkeletons()
                        : renderSuggestions()}
                </div>
                <div className="flex flex-row items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollLeft}
                        disabled={isLoading}
                        className="h-8 w-8 shrink-0 rounded-full p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={scrollRight}
                        disabled={isLoading}
                        className="h-8 w-8 shrink-0 rounded-full p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="h-8 w-8 shrink-0 rounded-full p-0"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>
            </div>
        </div>
    );
}
