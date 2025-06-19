"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import client from "@/lib/hono-client";
import type { SuggestionGenStreamResponse, Suggestions } from "@repo/ai";
import { parse, Allow } from "partial-json";
import { JsonOutputParser } from "@langchain/core/output_parsers";


export default function Suggestions({ platformUserId, autoLoad = true, setPrompt }: { platformUserId: string, autoLoad?: boolean, setPrompt: (prompt: string) => void }) {
    const [suggestions, setSuggestions] = useState<Suggestions["prompt_suggestions"]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const generateSuggestions = useCallback(async (refresh = false) => {
        if (!platformUserId) return;

        setIsLoading(true);
        if (refresh) {
            setSuggestions([]);
        }

        try {
            const response = await client.post.suggestions.$post({
                json: {
                    platformUserId,
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
                console.log("chunks", chunks);
                const chunksArray = chunks.split("\n").filter(chunk => chunk.trim() !== "");
                for (const chunk of chunksArray) {
                    const parsedChunk = await parser.parse(chunk) as SuggestionGenStreamResponse;
                    console.log("parsedChunk", parsedChunk);
                    if (parsedChunk.event !== "response") continue;
                    buffer += parsedChunk.content
                    const parsed = parse(buffer, Allow.ALL) as Partial<Suggestions>;
                    console.log("parsed", parsed);
                    const newSuggestions = parsed.prompt_suggestions || [];
                    setSuggestions(newSuggestions);
                    console.log("new suggestions", newSuggestions);
                }
            }
        } catch (error) {
            console.error("Error generating suggestions:", error);
            toast.error("Failed to generate suggestions");
        } finally {
            setIsLoading(false);
        }
    }, [platformUserId]);

    // Auto-load suggestions on mount
    useEffect(() => {
        if (autoLoad && platformUserId) {
            generateSuggestions(false);
        }
    }, [platformUserId, autoLoad, generateSuggestions]);

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
        return Array.from({ length: 10 }, (_, index) => (
            <Card key={`skeleton-${index}`} className="w-fit h-10 border-dashed flex items-center justify-center">
                <CardContent className="p-4 flex items-center">
                    <Skeleton className="h-4 w-64" />
                </CardContent>
            </Card>
        ));
    };

    const renderSuggestions = () => {
        return suggestions.map((suggestion, index) => (
            <Card
                key={index}
                className="w-fit h-10 border-dashed hover:border-solid hover:bg-muted transition-all cursor-pointer flex items-center justify-center"
                onClick={() => setPrompt(suggestion)}
            >
                <CardContent className="p-4 flex items-center">
                    <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                        {suggestion}
                    </p>
                </CardContent>
            </Card>
        ));
    };


    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={scrollLeft}
                        disabled={isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={scrollRight}
                        disabled={isLoading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div 
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {suggestions.length === 0 ? renderSkeletons() : renderSuggestions()}
            </div>
        </div>
    );
} 