"use client";
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateDraft } from "@/components/pages/draft/create-draft";
import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Send,
    Loader2,
    Sparkles,
    Globe,
    Undo2,
    ImagePlus,
    X,
    Paperclip,
    Copy,
    Download,
    Check,
    Redo2,
    Text,
    Image as ImageIcon,
} from "lucide-react";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type PostGenStreamResponse, type Post } from "@repo/ai";
import { Allow, parse } from "partial-json";
import { Toggle } from "@/components/ui/toggle";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface StreamData extends PostGenStreamResponse {
    platform: "X" | "LINKEDIN";
    draftId: string;
}

export interface PostVersion {
    post: string;
    version: number;
}

export interface ImageVersion {
    url: string;
    version: number;
}

export interface DraftState {
    posts: PostVersion[];
    images: ImageVersion[];
    currentPostVersion: number;
    currentImageVersion: number;
}

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    uploaded: boolean;
    uploading: boolean;
    imageUrl?: string;
}

const Page = () => {
    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftState, setDraftState] = useState<{
        x: DraftState;
        linkedin: DraftState;
    }>({
        x: {
            posts: [],
            images: [],
            currentPostVersion: 0,
            currentImageVersion: 0,
        },
        linkedin: {
            posts: [],
            images: [],
            currentPostVersion: 0,
            currentImageVersion: 0,
        },
    });

    const [prompt, setPrompt] = useState("");

    const [activeTab, setActiveTab] = useState<"x" | "linkedin">("x");
    const [platformToEdit, setPlatformToEdit] = useState<
        "all" | "x" | "linkedin"
    >("all");
    const [applyOn, setApplyOn] = useState<"post" | "image">("post");

    const [showUndoAlert, setShowUndoAlert] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(
        null,
    );
    const [forceWeb, setForceWeb] = useState(false);
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedStates, setCopiedStates] = useState<{
        [key: string]: boolean;
    }>({});

    const [isImageLoading, setIsImageLoading] = useState({
        x: false,
        linkedin: false,
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasStarted = useRef({
        x: false,
        linkedin: false,
    });
    const [options, setOptions] = useState<{
        x: string[];
        linkedin: string[];
    }>({
        x: [],
        linkedin: [],
    });

    const [currentEvent, setCurrentEvent] = useState<{
        x: StreamData["event"] | null;
        linkedin: StreamData["event"] | null;
    }>({
        x: null,
        linkedin: null,
    });

    const searchParams = useSearchParams();

    useEffect(() => {
        (() => {
            const draftIdFromUrl = searchParams.get("draftId");
            if (draftIdFromUrl) {
                setDraftId(draftIdFromUrl);
                return;
            }
            setDraftId(null);
        })();
    }, [searchParams]);

    const $post = client.post.draft.$post;
    const $createImage = client.post.draft.image.generate.$post;
    type CreateImage = InferRequestType<typeof $createImage>["json"];
    type DraftCreate = InferRequestType<typeof $post>["json"];

    // Load existing draft data when draftId is available
    const {
        data: draftData,
        isLoading: isDraftLoading,
        error: draftError,
    } = useQuery({
        queryKey: ["draft", draftId],
        queryFn: async () => {
            if (!draftId) return null;
            const response = await client.post.draft.posts.$get({
                query: { draftId },
            });
            if (!response.ok) throw new Error("Draft not found");
            return response.json();
        },
        enabled: !!draftId,
        retry: false,
    });

    // Image upload mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (image: UploadedImage) => {
            const response = await client.post.draft.image.upload.$post({
                form: {
                    image: image.file,
                },
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
            // Update image with uploaded URL
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

            // Remove failed image
            setImages(prev => prev.filter(img => img.id !== image.id));
        },
    });

    useEffect(() => {
        if (draftData) {
            const xPosts = draftData.data?.x?.posts || [];
            const linkedinPosts = draftData.data?.linkedin?.posts || [];
            const xImages = draftData.data?.x?.images || [];
            const linkedinImages = draftData.data?.linkedin?.images || [];

            setDraftState({
                x: {
                    posts: xPosts.map(
                        (
                            post: { content: string; version?: number },
                            index: number,
                        ) => ({
                            post: post.content,
                            version: post.version ?? index,
                        }),
                    ),
                    images: xImages,
                    currentPostVersion:
                        xPosts.length > 0 ? xPosts.length - 1 : 0,
                    currentImageVersion:
                        xImages.length > 0 ? xImages.length - 1 : 0,
                },
                linkedin: {
                    posts: linkedinPosts.map(
                        (
                            post: { content: string; version?: number },
                            index: number,
                        ) => ({
                            post: post.content,
                            version: post.version ?? index,
                        }),
                    ),
                    images: linkedinImages,
                    currentPostVersion:
                        linkedinPosts.length > 0 ? linkedinPosts.length - 1 : 0,
                    currentImageVersion:
                        linkedinImages.length > 0
                            ? linkedinImages.length - 1
                            : 0,
                },
            });
        }
    }, [draftData]);

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

        // Check if adding these files would exceed the limit
        if (images.length + newFiles.length > 5) {
            toast.error(
                `You can only upload up to 5 images. Currently have ${images.length} images.`,
            );
            return;
        }

        const validFiles = newFiles.filter(file => {
            const isImage =
                file.type === "image/jpeg" || file.type === "image/png";
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

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

            // Add images with uploading state
            setImages(prev => [
                ...prev,
                ...newImages.map(img => ({ ...img, uploading: true })),
            ]);

            // Upload each image using mutation
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

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(image => URL.revokeObjectURL(image.preview));
        };
    }, [images]);

    // Post creation/regeneration mutation
    const createPostMutation = useMutation({
        // create image is used for only first time post creation, while editing it should be false
        mutationFn: async ({
            data,
            createImage,
        }: {
            data: DraftCreate;
            createImage: boolean;
        }) => {
            const response = await $post({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create post");
            }
            return {
                response,
                createImage,
            };
        },
        onMutate: () => {
            if (draftId) {
                // Reset streaming data for regeneration
                setCurrentEvent({
                    x: null,
                    linkedin: null,
                });
                // Clear previous options
                setOptions({
                    x: [],
                    linkedin: [],
                });
            }
            hasStarted.current = { x: false, linkedin: false };
        },
        onSuccess: async ({ response, createImage }) => {
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response stream available");
            }

            const decoder = new TextDecoder();
            let receivedDraftId = "";
            const buffer = {
                x: "",
                linkedin: "",
            };

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        if (createImage && (draftId || receivedDraftId)) {
                            createImageMutation.mutate({
                                message:
                                    "create a related images for this post",
                                draftId: draftId || receivedDraftId,
                                platform: platformToEdit.toUpperCase() as
                                    | "X"
                                    | "LINKEDIN"
                                    | "ALL",
                                images: images
                                    .filter(img => img.uploaded)
                                    .map(img => img.imageUrl!),
                            });
                        }
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data: StreamData = JSON.parse(line);

                            if (data.draftId && !receivedDraftId) {
                                receivedDraftId = data.draftId;
                                if (!draftId) {
                                    // First time creation - update URL with query param
                                    const newUrl = `/draft?draftId=${data.draftId}`;
                                    window.history.replaceState(
                                        null,
                                        "",
                                        newUrl,
                                    );
                                    setDraftId(data.draftId);
                                }
                            }

                            if (data.event === "end") {
                                continue;
                            }

                            const platformKey = data.platform.toLowerCase() as
                                | "x"
                                | "linkedin";

                            if (currentEvent[platformKey] !== data.event) {
                                setCurrentEvent(prev => {
                                    const newEvent = {
                                        ...prev,
                                        [platformKey]: data.event,
                                    };
                                    return newEvent;
                                });
                            }

                            if (data.event === "response") {
                                buffer[platformKey] += data.content;

                                const parsed = parse(
                                    buffer[platformKey],
                                    Allow.ALL,
                                ) as Partial<Post>;
                                const newPostContent = parsed.post || "";
                                const newOptions = parsed.options || [];

                                // Update options if available
                                if (newOptions.length > 0) {
                                    setOptions(prev => ({
                                        ...prev,
                                        [platformKey]: newOptions,
                                    }));
                                }

                                if (newPostContent) {
                                    const isFirstTime =
                                        !hasStarted.current[platformKey];

                                    if (isFirstTime) {
                                        hasStarted.current[platformKey] = true;
                                        // Append new post
                                        setDraftState(prev => {
                                            const newPosts = [
                                                ...prev[platformKey].posts,
                                                {
                                                    post: newPostContent,
                                                    version:
                                                        prev[platformKey].posts
                                                            .length,
                                                },
                                            ];
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts,
                                                    currentPostVersion:
                                                        newPosts.length - 1,
                                                },
                                            };
                                            return newState;
                                        });
                                    } else {
                                        // Replace last post
                                        setDraftState(prev => {
                                            const newPosts = [
                                                ...prev[platformKey].posts,
                                            ];
                                            if (newPosts.length > 0) {
                                                newPosts[newPosts.length - 1] =
                                                    {
                                                        ...newPosts[
                                                            newPosts.length - 1
                                                        ],
                                                        post: newPostContent,
                                                    };
                                            }
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts,
                                                },
                                            };
                                            return newState;
                                        });
                                    }
                                }
                            }
                        } catch {
                            // Ignore JSON parse errors for streaming chunks
                        }
                    }
                }
            } catch (err) {
                console.error("Stream reading error:", err);
                toast.error("An error occurred while processing the post.");
            } finally {
                // Mark streaming as complete
                setCurrentEvent({ x: null, linkedin: null });
            }
        },
        onError: error => {
            toast.error(error.message || "Failed to create post");
            setCurrentEvent({
                x: null,
                linkedin: null,
            });
        },
    });

    const createImageMutation = useMutation({
        mutationFn: async (data: CreateImage) => {
            if (data.platform === "ALL") {
                setIsImageLoading({
                    x: true,
                    linkedin: true,
                });
            } else {
                setIsImageLoading({
                    x: data.platform === "X",
                    linkedin: data.platform === "LINKEDIN",
                });
            }

            const response = await $createImage({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create image");
            }
            return response.json();
        },
        onSuccess: response => {
            setIsImageLoading({
                x: false,
                linkedin: false,
            });
            const linkedinImageUrl = response.data?.linkedin;
            const xImageUrl = response.data?.x;

            setDraftState(prev => {
                const newState = { ...prev };

                if (linkedinImageUrl) {
                    const newImage = {
                        url: linkedinImageUrl,
                        version: prev.linkedin.images.length,
                    };
                    newState.linkedin = {
                        ...prev.linkedin,
                        images: [...prev.linkedin.images, newImage],
                        currentImageVersion: prev.linkedin.images.length,
                    };
                }

                if (xImageUrl) {
                    const newImage = {
                        url: xImageUrl,
                        version: prev.x.images.length,
                    };
                    newState.x = {
                        ...prev.x,
                        images: [...prev.x.images, newImage],
                        currentImageVersion: prev.x.images.length,
                    };
                }

                return newState;
            });

            toast.success("Image created successfully");
        },
        onError: error => {
            setIsImageLoading({
                x: false,
                linkedin: false,
            });
            toast.error(error.message || "Failed to create image");
        },
    });

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
                    draftId: draftId!,
                    platform,
                    applyOn,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to apply version");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Version applied successfully");
        },
        onError: error => {
            toast.error(error.message || "Failed to apply version");
        },
    });

    const handleCreatePost = (
        data: DraftCreate,
        createImage: boolean = false,
    ) => {
        setPlatformToEdit(
            (data?.platform?.toLowerCase() as "all" | "x" | "linkedin") ||
                "all",
        );
        createPostMutation.mutate({ data, createImage });
    };

    const handleApplyVersion = (
        type: "post" | "image",
        platformKey: "x" | "linkedin",
    ) => {
        const currentVersion =
            type === "post"
                ? draftState[platformKey].currentPostVersion
                : draftState[platformKey].currentImageVersion;

        applyVersionMutation.mutate({
            applyVersion: currentVersion,
            platform: platformKey.toUpperCase() as "X" | "LINKEDIN",
            applyOn: type.toUpperCase() as "POST" | "IMAGE",
        });
    };

    const canUndo = (type: "post" | "image") => {
        const state = draftState[activeTab];
        if (type === "post") {
            return state.currentPostVersion > 0;
        }
        return state.currentImageVersion > 0;
    };

    const canRedo = (type: "post" | "image") => {
        const state = draftState[activeTab];
        if (type === "post") {
            return state.currentPostVersion < state.posts.length - 1;
        }
        return state.currentImageVersion < state.images.length - 1;
    };

    const handleUndo = (type: "post" | "image") => {
        const platformKey = activeTab;
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
        const platformKey = activeTab;
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

    const handleSendMessage = () => {
        const currentPrompt = prompt;
        if (!currentPrompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        if (applyOn === "image") {
            createImageMutation.mutate({
                message: currentPrompt,
                images: images
                    .filter(img => img.uploaded)
                    .map(img => img.imageUrl!),
                platform: platformToEdit.toUpperCase() as
                    | "ALL"
                    | "X"
                    | "LINKEDIN",
                draftId: draftId!,
            });
        }
        if (applyOn === "post") {
            createPostMutation.mutate({
                data: {
                    message: currentPrompt,
                    images: images
                        .filter(img => img.uploaded)
                        .map(img => img.imageUrl!),
                    forceWeb: forceWeb,
                    platform:
                        (platformToEdit.toUpperCase() as
                            | "ALL"
                            | "X"
                            | "LINKEDIN") || "ALL",
                    id: draftId!,
                },
                createImage: false,
            });
        }
        setPrompt("");
        setImages([]);
    };

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

    const handleDownloadImage = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Image downloaded!");
        } catch {
            toast.error("Failed to download image");
        }
    };

    const Content = useMemo(() => {
        const ContentComponent = ({
            platformKey,
        }: {
            platformKey: "x" | "linkedin";
        }) => {
            const getEventText = (currentEvent: StreamData["event"]) => {
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

            const [isImageLoaded, setIsImageLoaded] = useState(false);
            const currentImageVersion =
                draftState[platformKey].currentImageVersion;

            useEffect(() => {
                setIsImageLoaded(false);
            }, [currentImageVersion]);

            return (
                <div className="flex flex-col items-center">
                    <div className="flex w-full flex-col gap-4 lg:flex-row">
                        <div className="w-full lg:w-1/2">
                            {/* Post Card */}
                            <Card className="mb-2 py-2">
                                <CardHeader className="flex w-full items-center">
                                    <div className="flex w-full items-center justify-between">
                                        {createPostMutation.isPending &&
                                        currentEvent[platformKey] ? (
                                            <div className="flex items-center gap-3">
                                                <TextShimmer
                                                    className="font-mono text-sm"
                                                    duration={1}
                                                >
                                                    {getEventText(
                                                        currentEvent[
                                                            platformKey
                                                        ],
                                                    )}
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
                                            {draftState[platformKey]
                                                .currentPostVersion <
                                                draftState[platformKey].posts
                                                    .length -
                                                    1 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        handleApplyVersion(
                                                            "post",
                                                            platformKey,
                                                        )
                                                    }
                                                    disabled={
                                                        applyVersionMutation.isPending
                                                    }
                                                >
                                                    APPLY
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleUndo("post")
                                                }
                                                disabled={!canUndo("post")}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Undo2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleRedo("post")
                                                }
                                                disabled={!canRedo("post")}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Redo2 className="h-4 w-4" />
                                            </Button>
                                            <span className="text-muted-foreground flex h-8 items-center text-xs">
                                                {draftState[platformKey].posts
                                                    .length > 0
                                                    ? `${draftState[platformKey].currentPostVersion + 1}/${draftState[platformKey].posts.length}`
                                                    : "0/0"}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardContent>
                                    {createPostMutation.isPending &&
                                    !draftState[platformKey].posts.length ? (
                                        <div className="h-96 space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    ) : draftState[platformKey].posts[
                                          draftState[platformKey]
                                              .currentPostVersion
                                      ]?.post ? (
                                        <div className="flex h-96 items-center justify-center">
                                            <div className="scroll-bar h-full overflow-y-auto">
                                                <div className="pt-4 pr-4 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {
                                                        draftState[platformKey]
                                                            .posts[
                                                            draftState[
                                                                platformKey
                                                            ].currentPostVersion
                                                        ].post
                                                    }
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
                                                            draftState[
                                                                platformKey
                                                            ].posts[
                                                                draftState[
                                                                    platformKey
                                                                ]
                                                                    .currentPostVersion
                                                            ].post,
                                                            `${platformKey}-post`,
                                                        )
                                                    }
                                                    aria-label={
                                                        copiedStates[
                                                            `${platformKey}-post`
                                                        ]
                                                            ? "Copied"
                                                            : "Copy to clipboard"
                                                    }
                                                    disabled={
                                                        copiedStates[
                                                            `${platformKey}-post`
                                                        ] ||
                                                        !draftState[platformKey]
                                                            .posts[
                                                            draftState[
                                                                platformKey
                                                            ].currentPostVersion
                                                        ]?.post
                                                    }
                                                >
                                                    <div
                                                        className={cn(
                                                            "transition-all",
                                                            copiedStates[
                                                                `${platformKey}-post`
                                                            ]
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
                                                            copiedStates[
                                                                `${platformKey}-post`
                                                            ]
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
                                                {copiedStates[
                                                    `${platformKey}-post`
                                                ]
                                                    ? "Copied!"
                                                    : "Copy post"}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="w-full lg:w-1/2">
                            {/* Image Card */}

                            <Card className="mb-2 py-2">
                                <CardHeader className="flex w-full items-center">
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ImagePlus className="h-5 w-5" />
                                            {isImageLoading[platformKey] ? (
                                                <TextShimmer
                                                    className="font-mono text-sm"
                                                    duration={1}
                                                >
                                                    Creating Image...
                                                </TextShimmer>
                                            ) : (
                                                <span className="font-medium">
                                                    Images
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {draftState[platformKey]
                                                .currentImageVersion <
                                                draftState[platformKey].images
                                                    .length -
                                                    1 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                    onClick={() =>
                                                        handleApplyVersion(
                                                            "image",
                                                            platformKey,
                                                        )
                                                    }
                                                    disabled={
                                                        applyVersionMutation.isPending
                                                    }
                                                >
                                                    APPLY
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleUndo("image")
                                                }
                                                disabled={!canUndo("image")}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Undo2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleRedo("image")
                                                }
                                                disabled={!canRedo("image")}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Redo2 className="h-4 w-4" />
                                            </Button>
                                            <span className="text-muted-foreground flex h-8 items-center text-xs">
                                                {draftState[platformKey].images
                                                    .length > 0
                                                    ? `${draftState[platformKey].currentImageVersion + 1}/${draftState[platformKey].images.length}`
                                                    : "0/0"}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <div className="relative flex items-center justify-center">
                                    {!draftState[platformKey].images.length ? (
                                        <div className="flex h-96 w-96 flex-col items-center justify-center gap-10">
                                            {draftState[platformKey].posts
                                                .length ? (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (draftId) {
                                                            createImageMutation.mutate(
                                                                {
                                                                    message:
                                                                        "create a related images for this post",
                                                                    draftId:
                                                                        draftId!,
                                                                    platform:
                                                                        platformToEdit.toUpperCase() as
                                                                            | "X"
                                                                            | "LINKEDIN"
                                                                            | "ALL",
                                                                    images: images
                                                                        .filter(
                                                                            img =>
                                                                                img.uploaded,
                                                                        )
                                                                        .map(
                                                                            img =>
                                                                                img.imageUrl!,
                                                                        ),
                                                                },
                                                            );
                                                            return;
                                                        }
                                                        toast.error(
                                                            "Please create a post first",
                                                        );
                                                    }}
                                                    disabled={
                                                        !draftId ||
                                                        draftState[platformKey]
                                                            .posts.length ===
                                                            0 ||
                                                        createPostMutation.isPending
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
                                            {(isImageLoading[platformKey] ||
                                                !isImageLoaded) && (
                                                <Skeleton className="absolute inset-0 mx-auto h-full w-96 rounded-lg" />
                                            )}
                                            <Image
                                                src={
                                                    draftState[platformKey]
                                                        .images[
                                                        currentImageVersion
                                                    ].url
                                                }
                                                alt="Generated image"
                                                fill
                                                className={cn(
                                                    "verflow-hidden mx-auto h-full rounded-lg object-contain transition-opacity duration-300",
                                                    !isImageLoaded &&
                                                        "opacity-0",
                                                )}
                                                onLoadingComplete={() =>
                                                    setIsImageLoaded(true)
                                                }
                                            />
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
                                                            draftState[
                                                                platformKey
                                                            ].images[
                                                                draftState[
                                                                    platformKey
                                                                ]
                                                                    .currentImageVersion
                                                            ].url,
                                                            `${platformKey}-post-image-${Date.now()}.png`,
                                                        )
                                                    }
                                                >
                                                    <Download className="h-4 w-4" />
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
                    </div>
                    {/* Suggestions */}
                    {options[platformKey].length > 0 &&
                        !currentEvent[platformKey] && (
                            <div className="mt-6 w-full space-y-3">
                                <div className="text-muted-foreground text-sm font-medium">
                                    Suggestions for improvement:
                                </div>
                                <div className="no-scrollbar flex flex-nowrap items-center gap-4 overflow-x-auto">
                                    {options[platformKey].map(
                                        (option, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                className="h-auto flex-shrink-0 justify-start p-3 text-left whitespace-normal"
                                                onClick={() => {
                                                    setPrompt(option);
                                                    textareaRef.current?.focus();
                                                }}
                                            >
                                                <Sparkles className="mt-0.5 mr-2 h-3 w-3 flex-shrink-0" />
                                                {option}
                                            </Button>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            );
        };

        ContentComponent.displayName = "Content";
        return ContentComponent;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftState, currentEvent, isImageLoading]);

    // If no draftId, show creation mode
    if (!draftId) {
        return (
            <CreateDraft
                handleCreatePost={handleCreatePost}
                isCreating={createPostMutation.isPending}
            />
        );
    }

    // If loading draft data, show loader
    if (isDraftLoading) {
        return (
            <div className="bg-background min-h-screen">
                <div className="container mx-auto max-w-4xl py-8">
                    <div className="flex items-center justify-center py-12">
                        <ThreeDotLoader size="lg" />
                        <span className="text-muted-foreground ml-3">
                            Loading draft...
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // If draft doesn't exist, show error
    if (draftError) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center">
                <div className="container mx-auto max-w-xl py-8">
                    <Alert variant="destructive">
                        <AlertDescription>
                            Draft doesn&apos;t exist or has been deleted.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-4xl space-y-6 py-8 pb-32">
                {/* Platform Tabs */}
                <div className="space-y-3"></div>
                <Tabs
                    value={activeTab}
                    onValueChange={value => {
                        setActiveTab(value as "x" | "linkedin");
                        if (value === "all") return;
                        setPlatformToEdit(
                            value.toLowerCase() as "x" | "linkedin",
                        );
                    }}
                    className="w-full gap-4"
                >
                    <TabsList className="grid w-full grid-cols-2 bg-transparent">
                        <TabsTrigger
                            value="x"
                            className="hover:bg-background flex items-center gap-2 p-3 hover:cursor-pointer"
                            // disabled={platform !== "X" && platform !== "ALL"}
                        >
                            <XLogo size="2xl" />X (Twitter)
                        </TabsTrigger>
                        <TabsTrigger
                            value="linkedin"
                            className="flex items-center gap-2"
                            // disabled={platform !== "LINKEDIN" && platform !== "ALL"}
                        >
                            <LinkedinLogo size="2xl" />
                            LinkedIn
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="x" className="mt-4 space-y-4">
                        <Content platformKey="x" />
                    </TabsContent>

                    <TabsContent value="linkedin" className="mt-4 space-y-4">
                        <Content platformKey="linkedin" />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Sticky Bottom Input  */}
            <div className="sticky right-0 bottom-0 left-0 -m-6 p-4 px-4 lg:px-36">
                <div>
                    <Card
                        className={`relative gap-1 rounded-2xl border p-2 shadow-lg transition-all duration-300 ${
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
                                    <div
                                        key={image.id}
                                        className="group relative"
                                    >
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

                                        {/* Upload loading overlay */}
                                        {image.uploading && (
                                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            </div>
                                        )}

                                        <button
                                            onClick={() =>
                                                removeImage(image.id)
                                            }
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute -top-1 -right-1 rounded-full p-0.5 transition-opacity"
                                        >
                                            <X className="h-2 w-2" />
                                        </button>
                                    </div>
                                ))}
                            <div className="flex-1" />
                            <div className="ml-4 flex items-center gap-1">
                                <div className="bg-input/50 inline-flex h-9 max-w-[400px] rounded-lg p-0.5">
                                    <RadioGroup
                                        value={platformToEdit}
                                        onValueChange={value => {
                                            setPlatformToEdit(
                                                value as
                                                    | "all"
                                                    | "x"
                                                    | "linkedin",
                                            );
                                            if (value === "all") return;
                                            setActiveTab(
                                                value.toLowerCase() as
                                                    | "x"
                                                    | "linkedin",
                                            );
                                        }}
                                        className="group after:bg-card has-[:focus-visible]:after:outline-ring/70 relative inline-grid grid-cols-[1fr_1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/3 after:rounded-md after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 data-[state=all]:after:translate-x-[200%] data-[state=linkedin]:after:translate-x-full data-[state=x]:after:translate-x-0"
                                        data-state={platformToEdit}
                                    >
                                        <label className="group-data-[state=linkedin]:text-muted-foreground/70 group-data-[state=all]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none">
                                            <XLogo size="sm" />
                                            <RadioGroupItem
                                                value="x"
                                                className="sr-only"
                                            />
                                        </label>
                                        <label className="group-data-[state=x]:text-muted-foreground/70 group-data-[state=all]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none">
                                            <LinkedinLogo size="sm" />
                                            <RadioGroupItem
                                                value="linkedin"
                                                className="sr-only"
                                            />
                                        </label>
                                        <label className="group-data-[state=x]:text-muted-foreground/70 group-data-[state=linkedin]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-3 whitespace-nowrap transition-colors select-none">
                                            <span className="text-xs font-medium">
                                                ALL
                                            </span>
                                            <RadioGroupItem
                                                value="all"
                                                className="sr-only"
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
                                if (
                                    e.key === "Enter" &&
                                    (e.metaKey || e.ctrlKey)
                                ) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="placeholder:text-muted-foreground scroll-bar max-h-20 min-h-20 resize-none! rounded-2xl border-0 bg-transparent! p-2 text-lg leading-relaxed shadow-none focus-visible:ring-0"
                        />

                        {/* Bottom actions */}
                        <div className="flex items-center justify-between">
                            <TooltipProvider>
                                <div className="flex items-center gap-1">
                                    <div className="flex items-center gap-1">
                                        {/* Attach button */}
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
                                                        onPressedChange={
                                                            setForceWeb
                                                        }
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 rounded-full border-none bg-transparent p-0"
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
                                    <div className="ml-4 flex items-center gap-1">
                                        <div className="bg-input/50 inline-flex h-9 max-w-[400px] rounded-lg p-0.5">
                                            <RadioGroup
                                                value={applyOn}
                                                onValueChange={value =>
                                                    setApplyOn(
                                                        value as
                                                            | "post"
                                                            | "image",
                                                    )
                                                }
                                                className="group after:bg-card has-[:focus-visible]:after:outline-ring/70 relative inline-grid grid-cols-[1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/2 after:rounded-md after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 data-[state=image]:after:translate-x-full data-[state=post]:after:translate-x-0"
                                                data-state={applyOn}
                                            >
                                                <label className="group-data-[state=image]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-4 whitespace-nowrap transition-colors select-none">
                                                    <Text className="mr-2 h-5 w-5" />
                                                    <span>Post</span>
                                                    <RadioGroupItem
                                                        value="post"
                                                        className="sr-only"
                                                    />
                                                </label>
                                                <label className="group-data-[state=post]:text-muted-foreground/70 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-4 whitespace-nowrap transition-colors select-none">
                                                    <ImageIcon className="mr-2 h-5 w-5" />
                                                    <span>Image</span>
                                                    <RadioGroupItem
                                                        value="image"
                                                        className="sr-only"
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
                                    createPostMutation.isPending
                                }
                                size="sm"
                                className="h-8 w-8 rounded-full p-0"
                            >
                                {createPostMutation.isPending ? (
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
                                        Support JPG, PNG up to 5MB (max 5
                                        images)
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Undo Alert Dialog */}
            <AlertDialog open={showUndoAlert} onOpenChange={setShowUndoAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have undone some content. If you proceed, you
                            won&apos;t be able to recover the next posts or
                            images. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowUndoAlert(false);
                                setPendingAction(null);
                            }}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowUndoAlert(false);
                                if (pendingAction) {
                                    pendingAction();
                                    setPendingAction(null);
                                }
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Page;
