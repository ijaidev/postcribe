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


export default function Suggestions({ socialLoginId, autoLoad = true, setPrompt }: { socialLoginId: string, autoLoad?: boolean, setPrompt: (prompt: string) => void }) {
    const [suggestions, setSuggestions] = useState<Suggestions["suggestions"]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const generateSuggestions = useCallback(async (refresh = false) => {
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
                const chunks = decoder.decode(value, { stream: true })
                const chunksArray = chunks.split("\n").filter(chunk => chunk.trim() !== "");
                for (const chunk of chunksArray) {
                    const parsedChunk = await parser.parse(chunk) as SuggestionGenStreamResponse;
                    if (parsedChunk.event !== "response") continue;
                    buffer += parsedChunk.content;
                    const parsed = parse(buffer, Allow.ALL) as Partial<Suggestions>;
                    const newSuggestions = parsed.suggestions || [];
                    setSuggestions(prev => {
                        if (newSuggestions.length < prev.length) return prev;
                        if (newSuggestions.length > prev.length) return [...prev, ...newSuggestions.slice(prev.length)];
                        return [...prev.slice(0, -1), newSuggestions[newSuggestions.length - 1]];
                    });
                }
            }
        } catch (error) {
            console.error("Error generating suggestions:", error);
            toast.error("Failed to generate suggestions");
        } finally {
            setIsLoading(false);
        }
    }, [socialLoginId]);

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
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    const renderSkeletons = () => {
        return Array.from({ length: 8 }, (_, index) => (
            <Card key={`skeleton-${index}`} className="flex-shrink-0 w-96 min-h-40 border-dashed bg-muted/30 flex items-center justify-center">
                <CardContent className="p-3 flex items-center flex-col gap-4 justify-center">
                    <Skeleton className="h-3 w-90" />
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
                className="flex-shrink-0 min-w-fit min-h-40 border-0 bg-muted/50 hover:bg-muted transition-all cursor-pointer flex items-center justify-center p-0 shadow-sm hover:shadow-md"
                onClick={() => setPrompt(suggestion)}
            >
                <CardContent className="flex items-center justify-center px-4 py-2">
                    <p className="text-sm font-medium whitespace-pre-wrap text-center leading-relaxed max-w-md">
                        {suggestion}
                    </p>
                </CardContent>
            </Card>
        ));
    };


    return (
        <div className="space-y-3">
            <div className="relative flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollLeft}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 rounded-full shrink-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div
                    ref={scrollContainerRef}
                    className="flex gap-3 overflow-x-auto flex-1 py-1"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        scrollBehavior: 'smooth'
                    }}
                >
                    {suggestions.length === 0 ? renderSkeletons() : renderSuggestions()}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollRight}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 rounded-full shrink-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="h-8 w-8 p-0 rounded-full shrink-0"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        </div>
    );
} 