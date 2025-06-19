"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import client from "@/lib/hono-client";
import type { SuggestionGenStreamResponse, Suggestions } from "@repo/ai";
import { parse, Allow } from "partial-json";
import { JsonOutputParser } from "@langchain/core/output_parsers";


export default function Suggestions({ platformUserId, autoLoad = true }: { platformUserId: string, autoLoad?: boolean }) {
    const [suggestions, setSuggestions] = useState<Suggestions["prompt_suggestions"]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    const handleCopy = (suggestion: string) => {
        navigator.clipboard.writeText(suggestion);
        toast.success("Prompt copied to clipboard!");
    };

    const renderSkeletons = () => {
        return Array.from({ length: 10 }, (_, index) => (
            <Card key={`skeleton-${index}`} className="min-w-[280px] border-dashed">
                <CardContent className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-8 w-12" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        ));
    };

    const renderSuggestions = () => {
        return suggestions.map((suggestion, index) => (
            <Card
                key={index}
                className="min-w-[280px] border-dashed hover:border-solid transition-all"
            >
                <CardContent className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                                Prompt {index + 1}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(suggestion)}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-sm leading-relaxed font-medium">{suggestion}</p>
                    </div>
                </CardContent>
            </Card>
        ));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {`${suggestions.length} suggestions available`}
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

            <div className="flex gap-4 overflow-x-auto pb-4">
                {suggestions.length === 0 ? renderSkeletons() : renderSuggestions()}
            </div>
        </div>
    );
} 