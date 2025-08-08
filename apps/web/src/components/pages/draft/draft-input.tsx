"use client";

import { useState, useRef, useEffect, memo, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Send,
    Loader2,
    ImagePlus,
    X,
    Paperclip,
    Globe,
    Text,
    Image as ImageIcon,
    WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
} from "@/components/ui/tooltip";
import { motion } from "motion/react";
import Image from "next/image";
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    uploaded: boolean;
    uploading: boolean;
    imageUrl?: string;
}

type DraftCreate = InferRequestType<typeof client.post.draft.$post>["json"];
type CreateImage = InferRequestType<
    typeof client.post.draft.image.generate.$post
>["json"];

interface DraftInputProps {
    draftId: string | null;
    onSendPost: (data: DraftCreate) => void;
    onSendImage: (data: CreateImage) => void;
    isCreating: boolean;
    onActiveTabChange: (tab: "x" | "linkedin") => void;
    activeTab: "x" | "linkedin";
    prompt: string;
    setPrompt: (prompt: string) => void;
}

export const DraftInput = memo(function DraftInput({
    draftId,
    onSendPost,
    onSendImage,
    isCreating,
    onActiveTabChange,
    activeTab,
    prompt,
    setPrompt,
}: DraftInputProps) {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [forceWeb, setForceWeb] = useState(false);
    const [platformToEdit, setPlatformToEdit] = useState<
        "all" | "x" | "linkedin"
    >("all");
    const [applyOn, setApplyOn] = useState<"post" | "image">("post");
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [isButtonOverTextarea, setIsButtonOverTextarea] = useState(false);
    const isButtonVisible = useMemo(() => {
        return !isTextareaFocused && !prompt.trim() && !isButtonOverTextarea;
    }, [isTextareaFocused, prompt, isButtonOverTextarea]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPlatformToEdit(activeTab);
    }, [activeTab]);

    // Image upload mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (image: UploadedImage) => {
            const response = await client.post.draft.image.upload.$post({
                form: { image: image.file },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to upload image");
            }

            if (!result.data?.imageUrl) {
                throw new Error(result.message || "No image URL returned");
            }

            return result.data.imageUrl;
        },
        onSuccess: (imageUrl, image) => {
            setImages(prev =>
                prev.map(img =>
                    img.id === image.id
                        ? { ...img, uploaded: true, uploading: false, imageUrl }
                        : img,
                ),
            );
            toast.success(`${image.file.name} uploaded successfully`);
        },
        onError: (error, image) => {
            console.error("Upload error:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to upload image",
            );
            setImages(prev => prev.filter(img => img.id !== image.id));
        },
    });

    // Image handling functions
    const createImagePreview = (file: File): UploadedImage => {
        return {
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
        };
    };

    const handleFiles = async (files: FileList | File[]) => {
        const newFiles = Array.from(files);

        if (images.length + newFiles.length > 5) {
            toast.error(
                `You can only upload up to 5 images. Currently have ${images.length} images.`,
            );
            return;
        }

        const validFiles = newFiles.filter(file => {
            const isImage =
                file.type === "image/jpeg" || file.type === "image/png";
            const isValidSize = file.size <= 5 * 1024 * 1024;

            if (!isImage) {
                toast.error(`Only JPEG and PNG are allowed`);
                return false;
            }
            if (!isValidSize) {
                toast.error(`Image is too large (max 5MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            const newImages = validFiles.map(createImagePreview);
            setImages(prev => [
                ...prev,
                ...newImages.map(img => ({ ...img, uploading: true })),
            ]);

            newImages.forEach(image => {
                uploadImageMutation.mutate(image);
            });

            toast.success(`Starting upload of ${validFiles.length} image(s)`);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageFiles = items
            .filter(item => item.type.startsWith("image/"))
            .map(item => item.getAsFile())
            .filter((file): file is File => file !== null);

        if (imageFiles.length > 0) {
            handleFiles(imageFiles);
        }
    };

    const removeImage = (id: string) => {
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            return prev.filter(img => img.id !== id);
        });
    };

    const handleSendMessage = () => {
        const currentPrompt = prompt;
        if (!currentPrompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        const uploadedImages = images
            .filter(img => img.uploaded)
            .map(img => img.imageUrl!);

        if (applyOn === "image") {
            onSendImage({
                message: currentPrompt,
                images: uploadedImages,
                platform: platformToEdit.toUpperCase() as
                    | "ALL"
                    | "X"
                    | "LINKEDIN",
                draftId: draftId!,
            });
        } else {
            onSendPost({
                message: currentPrompt,
                images: uploadedImages,
                forceWeb: forceWeb,
                platform: platformToEdit.toUpperCase() as
                    | "ALL"
                    | "X"
                    | "LINKEDIN",
                id: draftId!,
            });
        }

        setImages([]);
    };

    const handlePlatformChange = (value: string) => {
        setPlatformToEdit(value as "all" | "x" | "linkedin");
        if (value !== "all") {
            onActiveTabChange(value as "x" | "linkedin");
        }
    };

    const handleMagicPencilClick = () => {
        containerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 300);
    };

    useEffect(() => {
        function checkOverlap() {
            const button = buttonRef.current;
            const container = containerRef.current;
            if (!(button && container)) return;

            const rect1 = button.getBoundingClientRect();
            const rect2 = container.getBoundingClientRect();

            const isOverlapping = !(
                rect1.right < rect2.left ||
                rect1.left > rect2.right ||
                rect1.bottom < rect2.top ||
                rect1.top > rect2.bottom
            );

            setIsButtonOverTextarea(isOverlapping);
        }

        checkOverlap(); // Initial check
        window.addEventListener("scroll", checkOverlap, true);
        window.addEventListener("resize", checkOverlap, true);

        return () => {
            window.removeEventListener("scroll", checkOverlap, true);
            window.removeEventListener("resize", checkOverlap, true);
        };
    }, []);

    // Mobile keyboard viewport handling
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleViewportChange = () => {
            // Ensure textarea is visible when keyboard appears
            if (isTextareaFocused && containerRef.current) {
                setTimeout(() => {
                    containerRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "end",
                    });
                }, 100);
            }
        };

        // Listen for viewport changes (keyboard appearance)
        window.visualViewport?.addEventListener("resize", handleViewportChange);

        return () => {
            window.visualViewport?.removeEventListener(
                "resize",
                handleViewportChange,
            );
        };
    }, [isTextareaFocused]);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(image => URL.revokeObjectURL(image.preview));
        };
    }, [images]);

    return (
        <div ref={containerRef} className="py-2">
            <Card
                className={`relative mx-auto max-w-4xl gap-1 rounded-2xl border p-2 shadow-lg transition-all duration-300 ${
                    isDragging
                        ? "border-primary ring-primary/20 scale-[1.02] shadow-2xl ring-2"
                        : "border-border hover:shadow-xl"
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg, image/png, image/jpg"
                    onChange={handleFileInput}
                    className="hidden"
                />

                {/* Images at top of card */}
                <div className="mb-1 flex flex-wrap gap-2">
                    {images.length > 0 &&
                        images.map(image => (
                            <div key={image.id} className="group relative">
                                <Image
                                    src={image.preview}
                                    alt="Upload preview"
                                    width={40}
                                    height={40}
                                    className={`rounded-lg border-2 object-cover shadow-sm transition-opacity ${
                                        image.uploading &&
                                        "border-primary opacity-70"
                                    }`}
                                />

                                {image.uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    </div>
                                )}

                                <button
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeImage(image.id);
                                    }}
                                    onMouseDown={e => {
                                        e.preventDefault();
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute -top-1 -right-1 rounded-full p-0.5 transition-opacity"
                                >
                                    <X className="h-2 w-2" />
                                </button>
                            </div>
                        ))}
                    <div className="flex-1" />

                    {/* Platform Selector */}
                    <div className="ml-4 flex items-center gap-1">
                        <div className="bg-input/50 inline-flex h-9 max-w-[400px] rounded-lg p-0.5">
                            <RadioGroup
                                value={platformToEdit}
                                onValueChange={handlePlatformChange}
                                className="group after:bg-card has-[:focus-visible]:after:outline-ring/70 relative inline-grid grid-cols-[1fr_1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/3 after:rounded-md after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 data-[state=all]:after:translate-x-[200%] data-[state=linkedin]:after:translate-x-full data-[state=x]:after:translate-x-0"
                                data-state={platformToEdit}
                            >
                                <label
                                    className="group-data-[state=linkedin]:text-muted-foreground/70 group-data-[state=all]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none"
                                    onMouseDown={e => e.preventDefault()}
                                    onPointerDown={e => e.preventDefault()}
                                    onTouchStart={e => e.preventDefault()}
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handlePlatformChange("x");
                                    }}
                                >
                                    <XLogo size="sm" />
                                    <RadioGroupItem
                                        value="x"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onMouseDown={e => e.preventDefault()}
                                        onPointerDown={e => e.preventDefault()}
                                        onTouchStart={e => e.preventDefault()}
                                        style={{ pointerEvents: "none" }}
                                    />
                                </label>
                                <label
                                    className="group-data-[state=x]:text-muted-foreground/70 group-data-[state=all]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none"
                                    onMouseDown={e => e.preventDefault()}
                                    onPointerDown={e => e.preventDefault()}
                                    onTouchStart={e => e.preventDefault()}
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handlePlatformChange("linkedin");
                                    }}
                                >
                                    <LinkedinLogo size="sm" />
                                    <RadioGroupItem
                                        value="linkedin"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onMouseDown={e => e.preventDefault()}
                                        onPointerDown={e => e.preventDefault()}
                                        onTouchStart={e => e.preventDefault()}
                                        style={{ pointerEvents: "none" }}
                                    />
                                </label>
                                <label
                                    className="group-data-[state=x]:text-muted-foreground/70 group-data-[state=linkedin]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none"
                                    onMouseDown={e => e.preventDefault()}
                                    onPointerDown={e => e.preventDefault()}
                                    onTouchStart={e => e.preventDefault()}
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handlePlatformChange("all");
                                    }}
                                >
                                    <span className="text-xs font-medium">
                                        ALL
                                    </span>
                                    <RadioGroupItem
                                        value="all"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onMouseDown={e => e.preventDefault()}
                                        onPointerDown={e => e.preventDefault()}
                                        onTouchStart={e => e.preventDefault()}
                                        style={{ pointerEvents: "none" }}
                                    />
                                </label>
                            </RadioGroup>
                        </div>
                    </div>
                </div>

                {/* Textarea */}
                <Textarea
                    ref={textareaRef}
                    placeholder="What's on your mind?"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    onFocus={() => setIsTextareaFocused(true)}
                    onBlur={() => setIsTextareaFocused(false)}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="placeholder:text-muted-foreground scroll-bar-2 text-md max-h-20 min-h-20 resize-none! rounded-2xl border-0 bg-transparent! p-2 leading-relaxed shadow-none focus-visible:ring-0 lg:text-lg"
                />

                {/* Bottom actions */}
                <div className="flex items-center justify-between">
                    <TooltipProvider>
                        <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            disabled={
                                                images.length >= 5 ||
                                                uploadImageMutation.isPending
                                            }
                                            className="hover:bg-accent h-8 w-8 rounded-full p-0"
                                        >
                                            <Paperclip
                                                className="text-muted-foreground h-15 w-15"
                                                size={15}
                                            />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span>Attach images</span>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <Toggle
                                                pressed={forceWeb}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 rounded-full border-none bg-transparent p-0"
                                                onMouseDown={e =>
                                                    e.preventDefault()
                                                }
                                                onPointerDown={e =>
                                                    e.preventDefault()
                                                }
                                                onTouchStart={e =>
                                                    e.preventDefault()
                                                }
                                                onClick={e => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setForceWeb(prev => !prev);
                                                    // maintain textarea focus on mobile
                                                    textareaRef.current?.focus();
                                                }}
                                            >
                                                <Globe
                                                    className="h-15 w-15"
                                                    size={15}
                                                />
                                            </Toggle>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <span>Toggle Web Search</span>
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            {/* Apply On Selector */}
                            <div className="ml-4 flex items-center gap-1">
                                <div className="bg-input/50 inline-flex h-9 max-w-[400px] rounded-lg p-0.5">
                                    <RadioGroup
                                        value={applyOn}
                                        onValueChange={value =>
                                            setApplyOn(
                                                value as "post" | "image",
                                            )
                                        }
                                        className="group after:bg-card has-[:focus-visible]:after:outline-ring/70 relative inline-grid grid-cols-[1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/2 after:rounded-md after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 data-[state=image]:after:translate-x-full data-[state=post]:after:translate-x-0"
                                        data-state={applyOn}
                                    >
                                        <label
                                            className="group-data-[state=image]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-4 whitespace-nowrap transition-colors select-none"
                                            onMouseDown={e =>
                                                e.preventDefault()
                                            }
                                            onPointerDown={e =>
                                                e.preventDefault()
                                            }
                                            onTouchStart={e =>
                                                e.preventDefault()
                                            }
                                            onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setApplyOn("post");
                                            }}
                                        >
                                            <Text className="mr-2 h-5 w-5" />
                                            <span>Post</span>
                                            <RadioGroupItem
                                                value="post"
                                                className="sr-only"
                                                tabIndex={-1}
                                                onMouseDown={e =>
                                                    e.preventDefault()
                                                }
                                                onPointerDown={e =>
                                                    e.preventDefault()
                                                }
                                                onTouchStart={e =>
                                                    e.preventDefault()
                                                }
                                                style={{
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        </label>
                                        <label
                                            className="group-data-[state=post]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-4 whitespace-nowrap transition-colors select-none"
                                            onMouseDown={e =>
                                                e.preventDefault()
                                            }
                                            onPointerDown={e =>
                                                e.preventDefault()
                                            }
                                            onTouchStart={e =>
                                                e.preventDefault()
                                            }
                                            onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setApplyOn("image");
                                            }}
                                        >
                                            <ImageIcon className="mr-2 h-5 w-5" />
                                            <span>Image</span>
                                            <RadioGroupItem
                                                value="image"
                                                className="sr-only"
                                                tabIndex={-1}
                                                onMouseDown={e =>
                                                    e.preventDefault()
                                                }
                                                onPointerDown={e =>
                                                    e.preventDefault()
                                                }
                                                onTouchStart={e =>
                                                    e.preventDefault()
                                                }
                                                style={{
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        </label>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>
                    </TooltipProvider>

                    {/* Send button */}
                    <Button
                        onClick={handleSendMessage}
                        disabled={
                            !prompt.trim() ||
                            images.some(img => img.uploading) ||
                            isCreating
                        }
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
                    >
                        {isCreating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Send className="h-3 w-3" />
                        )}
                    </Button>
                </div>

                {/* Enhanced Drag overlay */}
                {isDragging && (
                    <div className="from-primary/10 to-primary/5 border-primary pointer-events-none absolute inset-4 flex animate-pulse items-center justify-center rounded-xl border-2 border-dashed bg-gradient-to-br">
                        <div className="space-y-3 text-center">
                            <div className="relative">
                                <ImagePlus className="text-primary mx-auto h-12 w-12 animate-bounce" />
                                <div className="bg-primary/20 absolute inset-0 h-12 w-12 animate-ping rounded-full"></div>
                            </div>
                            <p className="text-primary text-lg font-semibold">
                                Drop your images here
                            </p>
                            <p className="text-primary/70 text-sm">
                                Support JPG, PNG up to 5MB (max 5 images)
                            </p>
                        </div>
                    </div>
                )}
            </Card>
            <motion.div
                animate={{
                    scale: isButtonVisible ? 1 : 0,
                    opacity: isButtonVisible ? 1 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                }}
                className="fixed right-6 bottom-6 z-50"
            >
                <Button
                    ref={buttonRef}
                    onClick={handleMagicPencilClick}
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-12 rounded-full shadow-lg hover:shadow-xl"
                >
                    <WandSparkles className="h-5 w-5" />
                </Button>
            </motion.div>
        </div>
    );
});
