"use client";

import React, { useState, memo } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { Copy, Check, Undo2, Redo2, LoaderCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { PostData } from "./types";

interface PostCardProps {
    platformKey: "x" | "linkedin";
    currentPost: PostData | undefined;
    currentVersion: number;
    totalPosts: number;
    isLoading: boolean;
    currentEvent: string | null;
    canUndo: boolean;
    canRedo: boolean;
    canApply: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onApply: () => void;
    isApplying: boolean;
}

const getEventText = (currentEvent: string | null) => {
    switch (currentEvent) {
        case "response":
            return "Generating...";
        case "search":
            return "Searching...";
        case "extract":
            return "Browsing...";
        default:
            return "Generating...";
    }
};

export const PostCard = memo(function PostCard({
    platformKey,
    currentPost,
    currentVersion,
    totalPosts,
    isLoading,
    currentEvent,
    canUndo,
    canRedo,
    canApply,
    onUndo,
    onRedo,
    onApply,
    isApplying,
}: PostCardProps) {
    const [copiedStates, setCopiedStates] = useState<{
        [key: string]: boolean;
    }>({});

    const handleCopyPost = async (text: string, postKey: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates(prev => ({ ...prev, [postKey]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [postKey]: false }));
            }, 1500);
            toast.success("Post copied to clipboard!");
        } catch {
            toast.error("Failed to copy post");
        }
    };

    return (
        <div className="w-full lg:w-1/2">
            {/* Post Header */}
            <Card className="mb-2 py-2">
                <CardHeader className="flex w-full items-center">
                    <div className="flex w-full items-center justify-between">
                        {isLoading && currentEvent ? (
                            <div className="flex items-center gap-3">
                                <TextShimmer
                                    className="font-mono text-sm"
                                    duration={1}
                                >
                                    {getEventText(currentEvent)}
                                </TextShimmer>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                {platformKey === "x" ? (
                                    <XLogo size="md" />
                                ) : (
                                    <LinkedinLogo size="md" />
                                )}
                                <span className="font-medium">
                                    {platformKey === "x"
                                        ? "X Post"
                                        : "LinkedIn Post"}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {canApply && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-20 text-xs"
                                    onClick={onApply}
                                    disabled={isApplying}
                                >
                                    {isApplying ? (
                                        <LoaderCircle className="animate-spin duration-75" />
                                    ) : (
                                        <span>APPLY</span>
                                    )}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onUndo}
                                disabled={!canUndo}
                                className="h-8 w-8 p-0"
                            >
                                <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRedo}
                                disabled={!canRedo}
                                className="h-8 w-8 p-0"
                            >
                                <Redo2 className="h-4 w-4" />
                            </Button>
                            <span className="text-muted-foreground flex h-8 items-center text-xs">
                                {totalPosts > 0
                                    ? `${currentVersion + 1}/${totalPosts}`
                                    : "0/0"}
                            </span>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Post Content */}
            <Card>
                <CardContent>
                    {isLoading && !totalPosts ? (
                        <div className="h-96 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : currentPost?.post ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="scroll-bar h-full overflow-y-auto">
                                <div className="pt-4 pr-4 text-sm leading-relaxed whitespace-pre-wrap">
                                    {currentPost.post}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground flex h-96 items-center justify-center py-8 text-center text-sm">
                            No post generated yet
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex items-center justify-end">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 disabled:opacity-100"
                                    onClick={() =>
                                        handleCopyPost(
                                            currentPost?.post || "",
                                            `${platformKey}-post`,
                                        )
                                    }
                                    aria-label={
                                        copiedStates[`${platformKey}-post`]
                                            ? "Copied"
                                            : "Copy to clipboard"
                                    }
                                    disabled={
                                        copiedStates[`${platformKey}-post`] ||
                                        !currentPost?.post
                                    }
                                >
                                    <div
                                        className={cn(
                                            "transition-all",
                                            copiedStates[`${platformKey}-post`]
                                                ? "scale-100 opacity-100"
                                                : "scale-0 opacity-0",
                                        )}
                                    >
                                        <Check
                                            className="stroke-emerald-500"
                                            size={16}
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div
                                        className={cn(
                                            "absolute transition-all",
                                            copiedStates[`${platformKey}-post`]
                                                ? "scale-0 opacity-0"
                                                : "scale-100 opacity-100",
                                        )}
                                    >
                                        <Copy
                                            size={16}
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </div>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="px-2 py-1 text-xs">
                                {copiedStates[`${platformKey}-post`]
                                    ? "Copied!"
                                    : "Copy post"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
        </div>
    );
});
