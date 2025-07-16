"use client";

import React, { memo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostCard } from "./post-card";
import { ImageCard } from "./image-card";
import { OptionsSection } from "./options-section";
import { DraftState } from "./types";
import { type PostGenStreamResponse } from "@repo/ai";
import client from "@/lib/hono-client";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface DraftContentProps {
    platformKey: "x" | "linkedin";
    draftState: DraftState;
    setDraftState: React.Dispatch<
        React.SetStateAction<{
            x: DraftState;
            linkedin: DraftState;
        }>
    >;
    draftId: string;
    currentEvent: PostGenStreamResponse["event"] | null;
    isImageLoading: boolean;
    options: string[];
    onCreateImage: (platformKey: "x" | "linkedin") => void;
    onSuggestionClick: (suggestion: string) => void;
    isCreating: boolean;
}

export const DraftContent = memo(function DraftContent({
    platformKey,
    draftState,
    setDraftState,
    draftId,
    currentEvent,
    isImageLoading,
    options,
    onCreateImage,
    onSuggestionClick,
    isCreating,
}: DraftContentProps) {
    // Add local state for dialog
    const [applyType, setApplyType] = useState<"post" | "image" | null>(null);
    // Apply version mutation
    const applyVersionMutation = useMutation({
        mutationFn: async ({
            applyVersion,
            platform,
            applyOn,
        }: {
            applyVersion: number;
            platform: "X" | "LINKEDIN";
            applyOn: "POST" | "IMAGE";
        }) => {
            const response = await client.post.draft.apply.$post({
                json: {
                    applyVersion,
                    draftId,
                    platform,
                    applyOn,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to apply version");
            }
            return response.json();
        },
        onSuccess: (_, { applyOn, applyVersion }) => {
            toast.success("Version applied successfully");
            setDraftState(prev => {
                const currentState = prev[platformKey];
                const contentKey = applyOn === "POST" ? "posts" : "images";
                const content = currentState[contentKey];

                return {
                    ...prev,
                    [platformKey]: {
                        ...currentState,
                        [contentKey]: content.slice(0, applyVersion + 1),
                    },
                };
            });
        },
        onError: error => {
            toast.error(error.message || "Failed to apply version");
        },
    });

    const canUndo = (type: "post" | "image") => {
        if (type === "post") {
            return draftState.currentPostVersion > 0;
        }
        return draftState.currentImageVersion > 0;
    };

    const canRedo = (type: "post" | "image") => {
        if (type === "post") {
            return draftState.currentPostVersion < draftState.posts.length - 1;
        }
        return draftState.currentImageVersion < draftState.images.length - 1;
    };

    const canApply = (type: "post" | "image") => {
        if (type === "post") {
            return draftState.currentPostVersion < draftState.posts.length - 1;
        }
        return draftState.currentImageVersion < draftState.images.length - 1;
    };

    const handleUndo = (type: "post" | "image") => {
        setDraftState(prev => {
            const currentState = prev[platformKey];
            const currentVersionKey =
                type === "post" ? "currentPostVersion" : "currentImageVersion";
            const newVersion = Math.max(0, currentState[currentVersionKey] - 1);

            return {
                ...prev,
                [platformKey]: {
                    ...currentState,
                    [currentVersionKey]: newVersion,
                },
            };
        });
    };

    const handleRedo = (type: "post" | "image") => {
        setDraftState(prev => {
            const currentState = prev[platformKey];
            const currentVersionKey =
                type === "post" ? "currentPostVersion" : "currentImageVersion";
            const maxVersion =
                type === "post"
                    ? currentState.posts.length - 1
                    : currentState.images.length - 1;
            const newVersion = Math.min(
                maxVersion,
                currentState[currentVersionKey] + 1,
            );

            return {
                ...prev,
                [platformKey]: {
                    ...currentState,
                    [currentVersionKey]: newVersion,
                },
            };
        });
    };

    const handleApplyVersion = (type: "post" | "image") => {
        const currentVersion =
            type === "post"
                ? draftState.currentPostVersion
                : draftState.currentImageVersion;

        applyVersionMutation.mutate({
            applyVersion: currentVersion,
            platform: platformKey.toUpperCase() as "X" | "LINKEDIN",
            applyOn: type.toUpperCase() as "POST" | "IMAGE",
        });
    };

    const handlePostUndo = () => handleUndo("post");
    const handlePostRedo = () => handleRedo("post");
    const handlePostApply = () => setApplyType("post");

    const handleImageUndo = () => handleUndo("image");
    const handleImageRedo = () => handleRedo("image");
    const handleImageApply = () => setApplyType("image");
    const handleCreateImage = () => onCreateImage(platformKey);

    // Get current items
    const currentPost = draftState.posts[draftState.currentPostVersion];
    const currentImage = draftState.images[draftState.currentImageVersion];

    return (
        <>
            <div className="flex flex-col items-center">
                <div className="flex w-full flex-col gap-4 lg:flex-row">
                    <PostCard
                        platformKey={platformKey}
                        currentPost={currentPost}
                        currentVersion={draftState.currentPostVersion}
                        totalPosts={draftState.posts.length}
                        isLoading={isCreating}
                        currentEvent={currentEvent}
                        canUndo={canUndo("post")}
                        canRedo={canRedo("post")}
                        canApply={canApply("post")}
                        onUndo={handlePostUndo}
                        onRedo={handlePostRedo}
                        onApply={handlePostApply}
                        isApplying={applyVersionMutation.isPending}
                    />

                    <ImageCard
                        platformKey={platformKey}
                        currentImage={currentImage}
                        currentVersion={draftState.currentImageVersion}
                        totalImages={draftState.images.length}
                        isLoading={isImageLoading}
                        canUndo={canUndo("image")}
                        canRedo={canRedo("image")}
                        canApply={canApply("image")}
                        onUndo={handleImageUndo}
                        onRedo={handleImageRedo}
                        onApply={handleImageApply}
                        onCreateImage={handleCreateImage}
                        isApplying={applyVersionMutation.isPending}
                        hasPost={draftState.posts.length > 0}
                    />
                </div>

                <OptionsSection
                    options={options}
                    isVisible={!currentEvent}
                    onSuggestionClick={onSuggestionClick}
                />
            </div>

            {/* Confirmation AlertDialog for apply version */}
            <AlertDialog
                open={!!applyType}
                onOpenChange={open => !open && setApplyType(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {applyType === "post"
                                ? "Apply this post version?"
                                : "Apply this image version?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {applyType === "post"
                                ? "You will lose all posts after this version. This action cannot be undone."
                                : "You will lose all images after this version. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setApplyType(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (applyType) handleApplyVersion(applyType);
                                setApplyType(null);
                            }}
                            disabled={applyVersionMutation.isPending}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});
