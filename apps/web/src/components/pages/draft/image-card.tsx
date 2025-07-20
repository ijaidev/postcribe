"use client";

import React, { useState, useEffect, memo } from "react";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImagePlus, Download, Undo2, Redo2, LoaderCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/ui/text-shimmer";
import Image from "next/image";
import { ImageData } from "./types";
import { ThreeDotSpinningLoader } from "@/components/ui/loaders";
import { toast } from "sonner";

interface ImageCardProps {
    platformKey: "x" | "linkedin";
    currentImage: ImageData | undefined;
    currentVersion: number;
    totalImages: number;
    isLoading: boolean;
    canUndo: boolean;
    canRedo: boolean;
    canApply: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onApply: () => void;
    onCreateImage: () => void;
    isApplying: boolean;
    hasPost: boolean;
    isPostLoading: boolean;
}

export const ImageCard = memo(function ImageCard({
    platformKey,
    currentImage,
    currentVersion,
    totalImages,
    isLoading,
    canUndo,
    canRedo,
    canApply,
    onUndo,
    onRedo,
    onApply,
    onCreateImage,
    isApplying,
    hasPost,
    isPostLoading,
}: ImageCardProps) {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        setIsImageLoaded(false);
    }, [currentVersion]);

    function handleDownloadImage(imageUrl: string, filename?: string): void {
        setIsDownloading(true);
        fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;

                if (filename) {
                    link.download = filename;
                } else {
                    const urlParts = imageUrl.split("/");
                    const defaultFilename =
                        urlParts[urlParts.length - 1].split("?")[0] ||
                        "downloaded_image.png";
                    link.download = defaultFilename;
                }

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error("Download failed:", error);
                toast.error("Failed to download image");
            })
            .finally(() => {
                setIsDownloading(false);
            });
    }

    return (
        <div className="w-full lg:w-1/2">
            {/* Image Header */}
            <Card className="mb-2 py-2">
                <CardHeader className="flex w-full items-center">
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ImagePlus className="h-5 w-5" />
                            {isLoading ? (
                                <TextShimmer
                                    className="font-mono text-sm"
                                    duration={1}
                                >
                                    Creating Image...
                                </TextShimmer>
                            ) : (
                                <span className="font-medium">Images</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {canApply && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-20 text-xs transition-all duration-75"
                                    onClick={onApply}
                                    disabled={isApplying}
                                >
                                    {isApplying ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin duration-75" />
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
                                {totalImages > 0
                                    ? `${currentVersion + 1}/${totalImages}`
                                    : "0/0"}
                            </span>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Image Content */}
            <Card>
                <div className="relative flex items-center justify-center">
                    {!currentImage && !isLoading ? (
                        <div className="flex h-96 w-96 flex-col items-center justify-center gap-10">
                            {hasPost ? (
                                <Button
                                    variant="outline"
                                    onClick={onCreateImage}
                                    disabled={
                                        isLoading ||
                                        isPostLoading ||
                                        !isImageLoaded
                                    }
                                >
                                    Create Image
                                </Button>
                            ) : (
                                <span className="text-muted-foreground text-sm">
                                    Create a post first
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="group relative flex h-96 w-96 items-center justify-center">
                            {(isLoading || !isImageLoaded) && (
                                <Skeleton className="absolute inset-0 z-10 mx-auto h-full w-96 rounded-lg" />
                            )}
                            {isLoading && (
                                <div className="bg-card/90 absolute inset-0 z-10 mx-auto flex h-full w-96 items-center justify-center">
                                    <ThreeDotSpinningLoader />
                                </div>
                            )}
                            {currentImage && (
                                <Image
                                    src={currentImage.imageUrl}
                                    alt="Generated image"
                                    fill
                                    className={cn(
                                        "verflow-hidden mx-auto h-full rounded-lg object-contain transition-opacity duration-300",
                                        !isImageLoaded && "opacity-0",
                                    )}
                                    onLoadingComplete={() =>
                                        setIsImageLoaded(true)
                                    }
                                />
                            )}
                        </div>
                    )}
                </div>

                <CardFooter className="flex items-center justify-end">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                        handleDownloadImage(
                                            currentImage?.imageUrl || "",
                                            `${platformKey}-post-image-${Date.now()}.png`,
                                        )
                                    }
                                    disabled={!currentImage?.imageUrl}
                                >
                                    {isDownloading ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin duration-75" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="px-2 py-1 text-xs">
                                Download image
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
        </div>
    );
});
