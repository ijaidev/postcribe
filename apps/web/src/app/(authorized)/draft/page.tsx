"use client"
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateDraft } from "@/components/pages/draft/create-draft";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles, Globe, Undo2, ImagePlus, X, Paperclip, Copy, Download, Check, Redo2, Text, Image as ImageIcon } from "lucide-react";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type PostGenStreamResponse, type Post } from "@repo/ai";
import { Allow, parse } from "partial-json";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
        x: { posts: [], images: [], currentPostVersion: 0, currentImageVersion: 0 },
        linkedin: { posts: [], images: [], currentPostVersion: 0, currentImageVersion: 0 }
    });

    const [prompt, setPrompt] = useState<{
        x: string;
        linkedin: string;
    }>({
        x: "",
        linkedin: ""
    });

    const [activeTab, setActiveTab] = useState<"x" | "linkedin">("x");
    const [platform, setPlatform] = useState<"ALL" | "X" | "LINKEDIN">("ALL");
    const [selectedXAccount, setSelectedXAccount] = useState<string | null>(null);
    const [showUndoAlert, setShowUndoAlert] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [forceWeb, setForceWeb] = useState(false);
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
    const [platFromToEdit, setPlatFromToEdit] = useState<"ALL" | "X" | "LINKEDIN">("ALL");
    const [applyOn, setApplyOn] = useState<"post" | "image">("post");

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasStarted = useRef({
        x: false,
        linkedin: false
    });
    const [options, setOptions] = useState<{
        x: string[];
        linkedin: string[];
    }>({
        x: [],
        linkedin: []
    });

    const [currentEvent, setCurrentEvent] = useState<{
        x: StreamData["event"] | null;
        linkedin: StreamData["event"] | null;
    }>({
        x: null,
        linkedin: null
    });

    const searchParams = useSearchParams();

    useEffect(() => {
        ; (() => {
            const draftIdFromUrl = searchParams.get('draftId');
            if (draftIdFromUrl) {
                setDraftId(draftIdFromUrl);
                return;
            }
            setDraftId(null);
        })()
    }, [searchParams]);

    const $post = client.post.draft.$post;
    const $createImage = client.post.draft.image.generate.$post;
    type CreateImage = InferRequestType<typeof $createImage>['json'];
    type DraftCreate = InferRequestType<typeof $post>['json'];

    // Load connected social accounts
    const { data: socialAccounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ["social-accounts"],
        queryFn: async () => {
            const response = await client.social.accounts.$get();
            if (!response.ok) throw new Error('Failed to fetch accounts');
            return response.json();
        },
    });

    // Auto-select first X account when accounts are loaded
    useEffect(() => {
        if (socialAccounts?.data && !selectedXAccount) {
            const xAccounts = socialAccounts.data.filter(account =>
                account.provider === "X" && account.isConnected
            );
            if (xAccounts.length > 0) {
                setSelectedXAccount(xAccounts[0].id);
            }
        }
    }, [socialAccounts, selectedXAccount]);

    // Load existing draft data when draftId is available
    const { data: draftData, isLoading: isDraftLoading, error: draftError } = useQuery({
        queryKey: ["draft", draftId],
        queryFn: async () => {
            if (!draftId) return null;
            const response = await client.post.draft.posts.$get({ query: { draftId } });
            if (!response.ok) throw new Error('Draft not found');
            return response.json();
        },
        enabled: !!draftId,
        retry: false
    });

    // Image upload mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (image: UploadedImage) => {
            const response = await client.post.draft.image.upload.$post({
                form: {
                    image: image.file
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to upload image');
            }

            if (!result.data?.imageUrl) {
                throw new Error(result.message || 'No image URL returned');
            }

            return result.data.imageUrl;
        },
        onSuccess: (imageUrl, image) => {
            // Update image with uploaded URL
            setImages(prev => prev.map(img =>
                img.id === image.id
                    ? { ...img, uploaded: true, uploading: false, imageUrl }
                    : img
            ));
            toast.success(`${image.file.name} uploaded successfully`);
        },
        onError: (error, image) => {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload image');

            // Remove failed image
            setImages(prev => prev.filter(img => img.id !== image.id));
        }
    });

    useEffect(() => {
        if (draftData?.data) {
            // Update platform from the backend response
            if (draftData.data.platform) {
                setPlatform(draftData.data.platform);
                setPlatFromToEdit(draftData.data.platform);
            }

            const postsData = draftData.data.posts
            const xPosts = postsData?.x?.posts || [];
            const linkedinPosts = postsData?.linkedin?.posts || [];
            const xImages = postsData?.x?.images || [];
            const linkedinImages = postsData?.linkedin?.images || [];

            setDraftState({
                x: {
                    posts: xPosts.map((post: { content: string; version?: number }, index: number) => ({
                        post: post.content,
                        version: post.version ?? index,
                    })),
                    images: xImages,
                    currentPostVersion: xPosts.length > 0 ? xPosts.length - 1 : 0,
                    currentImageVersion: xImages.length > 0 ? xImages.length - 1 : 0
                },
                linkedin: {
                    posts: linkedinPosts.map((post: { content: string; version?: number }, index: number) => ({
                        post: post.content,
                        version: post.version ?? index,
                    })),
                    images: linkedinImages,
                    currentPostVersion: linkedinPosts.length > 0 ? linkedinPosts.length - 1 : 0,
                    currentImageVersion: linkedinImages.length > 0 ? linkedinImages.length - 1 : 0
                }
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
            toast.error(`You can only upload up to 5 images. Currently have ${images.length} images.`);
            return;
        }

        const validFiles = newFiles.filter(file => {
            const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

            if (!isImage) {
                toast.error(`${file.name} is not an image file`);
                return false;
            }
            if (!isValidSize) {
                toast.error(`${file.name} is too large (max 5MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            const newImages = validFiles.map(createImagePreview);

            // Add images with uploading state
            setImages(prev => [...prev, ...newImages.map(img => ({ ...img, uploading: true }))]);

            // Upload each image using mutation
            newImages.forEach((image) => {
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
            .filter(item => item.type.startsWith('image/'))
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
        mutationFn: async ({ data, createImage }: { data: DraftCreate; createImage: boolean }) => {
            const response = await $post({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create post");
            }
            return {
                response,
                createImage
            };
        },
        onMutate: () => {
            if (draftId) {
                // Reset streaming data for regeneration
                setCurrentEvent({
                    x: null,
                    linkedin: null
                });
                // Clear previous options
                setOptions({
                    x: [],
                    linkedin: []
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
                linkedin: ""
            };

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        if (createImage && (draftId || receivedDraftId)) {
                            createImageMutation.mutate({
                                message: "create a related images for this post",
                                id: draftId || receivedDraftId,
                                platform: platform.toLowerCase() as "all" | "x" | "linkedin",
                                images: images.filter(img => img.uploaded).map(img => img.imageUrl!)
                            });
                        }
                        break;
                    };

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data: StreamData = JSON.parse(line);

                            if (data.draftId && !receivedDraftId) {
                                receivedDraftId = data.draftId;
                                if (!draftId) {
                                    // First time creation - update URL with query param
                                    const newUrl = `/draft?draftId=${data.draftId}`;
                                    window.history.replaceState(null, '', newUrl);
                                    setDraftId(data.draftId);
                                }
                            }

                            if (data.event === "end") {
                                continue;
                            }

                            const platformKey = data.platform.toLowerCase() as "x" | "linkedin";

                            if (currentEvent[platformKey] !== data.event) {
                                setCurrentEvent(prev => {
                                    const newEvent = { ...prev, [platformKey]: data.event };
                                    return newEvent;
                                });
                            }

                            if (data.event === "response") {
                                buffer[platformKey] += data.content;

                                const parsed = parse(buffer[platformKey], Allow.ALL) as Partial<Post>;
                                const newPostContent = parsed.post || "";
                                const newOptions = parsed.options || [];

                                // Update options if available
                                if (newOptions.length > 0) {
                                    setOptions(prev => ({
                                        ...prev,
                                        [platformKey]: newOptions
                                    }));
                                }

                                if (newPostContent) {
                                    const isFirstTime = !hasStarted.current[platformKey];

                                    if (isFirstTime) {
                                        hasStarted.current[platformKey] = true;
                                        // Append new post
                                        setDraftState(prev => {
                                            const newPosts = [...prev[platformKey].posts, { post: newPostContent, version: prev[platformKey].posts.length }];
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts,
                                                    currentPostVersion: newPosts.length - 1
                                                }
                                            };
                                            return newState;

                                        });
                                    } else {
                                        // Replace last post
                                        setDraftState(prev => {
                                            const newPosts = [...prev[platformKey].posts];
                                            if (newPosts.length > 0) {
                                                newPosts[newPosts.length - 1] = { ...newPosts[newPosts.length - 1], post: newPostContent };
                                            }
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts
                                                }
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
        onError: (error) => {
            toast.error(error.message || "Failed to create post");
            setCurrentEvent({
                x: null,
                linkedin: null
            });
        }
    });

    const createImageMutation = useMutation({
        mutationFn: async (data: CreateImage) => {
            const response = await $createImage({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create image");
            }
            return response.json();
        },
        onSuccess: (response) => {
            const linkedinImages = response.data?.linkedin;
            const xImages = response.data?.x;
            if (linkedinImages) {
                setDraftState(prev => {
                    const newImage = {
                        url: linkedinImages,
                        version: prev.linkedin.images.length
                    }
                    const newState = { ...prev };
                    newState.linkedin.images = [...prev.linkedin.images, newImage];
                    newState.linkedin.currentImageVersion = newState.linkedin.images.length - 1;
                    return newState;
                });
            }
            if (xImages) {
                setDraftState(prev => {
                    const newImage = {
                        url: xImages,
                        version: prev.x.images.length
                    }
                    const newState = { ...prev };
                    newState.x.images = [...prev.x.images, newImage];
                    newState.x.currentImageVersion = newState.x.images.length - 1;
                    return newState;
                });
            }
            toast.success("Image created successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create image");
        }
    });

    const handleCreatePost = (data: DraftCreate, createImage: boolean = false) => {
        setPlatform(data.platform as "ALL" | "X" | "LINKEDIN");
        createPostMutation.mutate({ data, createImage });
    };

    const canUndo = (type: 'post' | 'image') => {
        const state = draftState[activeTab];
        if (type === 'post') {
            return state.currentPostVersion > 0;
        }
        return state.currentImageVersion > 0;
    };

    const canRedo = (type: 'post' | 'image') => {
        const state = draftState[activeTab];
        if (type === 'post') {
            return state.currentPostVersion < state.posts.length - 1;
        }
        return state.currentImageVersion < state.images.length - 1;
    };

    const handleUndo = (type: 'post' | 'image') => {
        const platformKey = activeTab;
        setDraftState(prev => {
            const currentState = prev[platformKey];
            const currentVersionKey = type === 'post' ? 'currentPostVersion' : 'currentImageVersion';
            const newVersion = Math.max(0, currentState[currentVersionKey] - 1);

            return {
                ...prev,
                [platformKey]: {
                    ...currentState,
                    [currentVersionKey]: newVersion
                }
            };
        });
    };

    const handleRedo = (type: 'post' | 'image') => {
        const platformKey = activeTab;
        setDraftState(prev => {
            const currentState = prev[platformKey];
            const currentVersionKey = type === 'post' ? 'currentPostVersion' : 'currentImageVersion';
            const maxVersion = type === 'post' ? currentState.posts.length - 1 : currentState.images.length - 1;
            const newVersion = Math.min(maxVersion, currentState[currentVersionKey] + 1);

            return {
                ...prev,
                [platformKey]: {
                    ...currentState,
                    [currentVersionKey]: newVersion
                }
            };
        });
    };

    const handleSendMessage = () => {
        const currentPrompt = prompt[activeTab];
        if (!currentPrompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        // Check for X account selection if targeting X platform
        if ((platform === "X" || platform === "ALL") && !selectedXAccount) {
            toast.error("Please select an X account");
            return;
        }

        const hasUndoneContent = () => {
            const state = draftState[activeTab];
            return (state.currentPostVersion < state.posts.length - 1) ||
                (state.currentImageVersion < state.images.length - 1);
        };

        const sendRequest = () => {
            const data: DraftCreate = {
                message: currentPrompt,
                images: images.filter(img => img.uploaded).map(img => img.imageUrl!),
                forceWeb: forceWeb,
                version: applyOn === "post" ?
                    draftState[activeTab].currentPostVersion :
                    draftState[activeTab].currentImageVersion,
                ...(selectedXAccount && (platform === "X" || platform === "ALL") && { xLoginId: selectedXAccount })
            };

            // Only include draftId and platform for existing drafts and new drafts respectively
            if (draftId) {
                // For existing drafts, include ID but not platform (backend gets it from draft)
                data.id = draftId;
            } else {
                // For new drafts, include platform but not ID
                data.platform = platform as "ALL" | "X" | "LINKEDIN";
            }

            createPostMutation.mutate({
                data,
                createImage: false
            });
            setPrompt(prev => ({ ...prev, [activeTab]: "" }));
        };

        if (hasUndoneContent()) {
            setPendingAction(() => sendRequest);
            setShowUndoAlert(true);
        } else {
            sendRequest();
        }
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
            const a = document.createElement('a');
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

    const Content = ({
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
        }

        return (
            <div className="flex flex-col items-center">
                <div className="flex gap-4 lg:flex-row flex-col w-full">
                    <div className="w-full lg:w-1/2">
                        {/* Post Card */}
                        <Card className="py-2 mb-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    {
                                        (createPostMutation.isPending && currentEvent[platformKey]) ? (
                                            <div className="flex items-center gap-3">
                                                <TextShimmer className='font-mono text-sm' duration={1}>
                                                    {getEventText(currentEvent[platformKey])}
                                                </TextShimmer>
                                            </div>
                                        ) :
                                            (
                                                <div className="flex items-center gap-3">
                                                    {platformKey === "x" ? <XLogo size="md" /> : <LinkedinLogo size="md" />}
                                                    <span className="font-medium">{platformKey === "x" ? "X Post" : "LinkedIn Post"}</span>
                                                </div>
                                            )
                                    }

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUndo('post')}
                                            disabled={!canUndo('post')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRedo('post')}
                                            disabled={!canRedo('post')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Redo2 className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                            {draftState[platformKey].posts.length > 0 ? `${draftState[platformKey].currentPostVersion + 1}/${draftState[platformKey].posts.length}` : '0/0'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardContent>
                                {createPostMutation.isPending && !draftState[platformKey].posts.length ? (
                                    <div className="space-y-2 h-96">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : draftState[platformKey].posts[draftState[platformKey].currentPostVersion]?.post ? (
                                    <div className="h-96 flex items-center justify-center">
                                        <div className="overflow-y-auto scroll-bar h-full">
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed pr-4 pt-4">
                                                {draftState[platformKey].posts[draftState[platformKey].currentPostVersion].post}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-96 text-muted-foreground text-sm py-8 text-center">
                                        No post generated yet
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-end ">
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 disabled:opacity-100"
                                                onClick={() => handleCopyPost(draftState[platformKey].posts[draftState[platformKey].currentPostVersion].post, `${platformKey}-post`)}
                                                aria-label={copiedStates[`${platformKey}-post`] ? "Copied" : "Copy to clipboard"}
                                                disabled={copiedStates[`${platformKey}-post`] || !draftState[platformKey].posts[draftState[platformKey].currentPostVersion]?.post}
                                            >
                                                <div
                                                    className={cn(
                                                        "transition-all",
                                                        copiedStates[`${platformKey}-post`] ? "scale-100 opacity-100" : "scale-0 opacity-0",
                                                    )}
                                                >
                                                    <Check className="stroke-emerald-500" size={16} strokeWidth={2} aria-hidden="true" />
                                                </div>
                                                <div
                                                    className={cn(
                                                        "absolute transition-all",
                                                        copiedStates[`${platformKey}-post`] ? "scale-0 opacity-0" : "scale-100 opacity-100",
                                                    )}
                                                >
                                                    <Copy size={16} strokeWidth={2} aria-hidden="true" />
                                                </div>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="px-2 py-1 text-xs">
                                            {copiedStates[`${platformKey}-post`] ? "Copied!" : "Copy post"}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </CardFooter>
                        </Card>

                    </div>


                    <div className="w-full lg:w-1/2">
                        {/* Image Card */}

                        <Card className="mb-2 py-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <ImagePlus className="h-5 w-5" />
                                        {
                                            createImageMutation.isPending || (createPostMutation.isPending && !draftState[platformKey].images.length) ? (
                                                <TextShimmer className='font-mono text-sm' duration={1}>
                                                    Creating Image...
                                                </TextShimmer>
                                            ) :
                                                <span className="font-medium">Images</span>
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUndo('image')}
                                            disabled={!canUndo('image')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRedo('image')}
                                            disabled={!canRedo('image')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Redo2 className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                            {draftState[platformKey].images.length > 0 ? `${draftState[platformKey].currentImageVersion + 1}/${draftState[platformKey].images.length}` : '0/0'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>

                        </Card>
                        <Card>
                            <div className="relative flex items-center justify-center">
                                {draftState[platformKey].images[draftState[platformKey].currentImageVersion] ? (
                                    <div className="relative group h-96 w-full flex items-center justify-center">
                                        <Image
                                            src={draftState[platformKey].images[draftState[platformKey].currentImageVersion].url}
                                            alt="Generated image"
                                            fill
                                            className="w-full h-full mx-auto rounded-lg object-contain"
                                        />
                                    </div>
                                ) : createImageMutation.isPending || (createPostMutation.isPending && !draftState[platformKey].images.length) ? (
                                    <div className="h-96 w-96">
                                        <Skeleton className="w-full h-full" />
                                    </div>
                                ) : (
                                    <div className="h-96 w-96 flex items-center justify-center">
                                        <Button variant="outline"
                                            onClick={() => {
                                                if (draftId) {
                                                    createImageMutation.mutate({
                                                        message: "create a related images for this post",
                                                        id: draftId,
                                                        platform: platform.toLowerCase() as "all" | "x" | "linkedin",
                                                        images: images.filter(img => img.uploaded).map(img => img.imageUrl!)
                                                    });
                                                    return;
                                                }
                                                toast.error("Please create a post first");
                                            }}
                                            disabled={!draftId || draftState[platformKey].posts.length === 0}

                                        >
                                            Create Image
                                        </Button>
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
                                                onClick={() => handleDownloadImage(
                                                    draftState[platformKey].images[draftState[platformKey].currentImageVersion].url,
                                                    `${platformKey}-post-image-${Date.now()}.png`
                                                )}
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
                {options[platformKey].length > 0 && !currentEvent[platformKey] && (
                    <div className="mt-6 space-y-3 w-full">
                        <div className="text-sm font-medium text-muted-foreground">
                            Suggestions for improvement:
                        </div>
                        <div className="flex items-center flex-nowrap gap-4 overflow-x-auto no-scrollbar">
                            {options[platformKey].map((option, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start text-left h-auto p-3 whitespace-normal flex-shrink-0"
                                    onClick={() => {
                                        setPrompt(prev => ({ ...prev, [platformKey]: option }));
                                        textareaRef.current?.focus();
                                    }}
                                >
                                    <Sparkles className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // If no draftId, show creation mode
    if (!draftId) {
        return (
            <CreateDraft handleCreatePost={handleCreatePost} isCreating={createPostMutation.isPending} />
        );
    }

    // If loading draft data, show loader
    if (isDraftLoading || isLoadingAccounts) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container max-w-4xl mx-auto py-8">
                    <div className="flex items-center justify-center py-12">
                        <ThreeDotLoader size="lg" />
                        <span className="ml-3 text-muted-foreground">Loading draft...</span>
                    </div>
                </div>
            </div>
        );
    }

    // If draft doesn't exist, show error
    if (draftError) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="container max-w-xl mx-auto py-8">
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
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-8 pb-32 space-y-6">
                {/* Platform Tabs */}
                <div className="space-y-3"></div>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "x" | "linkedin")} className="w-full gap-4">
                    <TabsList className="grid w-full grid-cols-2 bg-transparent">
                        <TabsTrigger
                            value="x"
                            className="flex items-center gap-2 p-3 hover:cursor-pointer hover:bg-background"
                            disabled={platform !== "X" && platform !== "ALL"}
                            defaultChecked={platform === "X"}
                        >
                            <XLogo size="2xl" />
                            X (Twitter)
                        </TabsTrigger>
                        <TabsTrigger
                            value="linkedin"
                            className="flex items-center gap-2"
                            disabled={platform !== "LINKEDIN" && platform !== "ALL"}
                            defaultChecked={platform === "LINKEDIN"}
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
            <div className="sticky bottom-0 left-0 right-0 p-4 -m-6 px-36 ">
                <div>
                    <Card
                        className={`relative rounded-2xl border shadow-lg transition-all duration-300 p-2 gap-1 ${isDragging
                            ? "border-primary shadow-2xl scale-[1.02] ring-2 ring-primary/20"
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
                        <div className="flex flex-wrap gap-2 mb-1">
                            {images.length > 0 && images.map((image) => (
                                <div key={image.id} className="relative group">
                                    <Image
                                        src={image.preview}
                                        alt="Upload preview"
                                        width={40}
                                        height={40}
                                        className={`object-cover rounded-lg border-2 shadow-sm transition-opacity ${image.uploading && 'border-primary opacity-70'
                                            }`}
                                    />

                                    {/* Upload loading overlay */}
                                    {image.uploading && (
                                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => removeImage(image.id)}
                                        className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full transition-opacity hover:bg-destructive/90"
                                    >
                                        <X className="h-2 w-2" />
                                    </button>
                                </div>
                            ))}
                            {platform === "ALL" && (<>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1 ml-4">
                                    <div className="inline-flex h-9 rounded-lg bg-input/50 p-0.5 max-w-[400px]">
                                        <RadioGroup
                                            value={platFromToEdit}
                                            onValueChange={(value) => setPlatFromToEdit(value as "ALL" | "X" | "LINKEDIN")}
                                            className="group relative inline-grid grid-cols-[1fr_1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/3 after:rounded-md after:bg-card after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 has-[:focus-visible]:after:outline-ring/70 data-[state=X]:after:translate-x-0 data-[state=LINKEDIN]:after:translate-x-full data-[state=ALL]:after:translate-x-[200%]"
                                            data-state={platFromToEdit}
                                        >
                                            <label className="relative z-10 inline-flex h-full min-w-8 cursor-pointer select-none items-center justify-center whitespace-nowrap px-3 transition-colors group-data-[state=LINKEDIN]:text-muted-foreground/70 group-data-[state=ALL]:text-muted-foreground/70">
                                                <XLogo size="sm" />
                                                <RadioGroupItem value="X" className="sr-only" />
                                            </label>
                                            <label className="relative z-10 inline-flex h-full min-w-8 cursor-pointer select-none items-center justify-center whitespace-nowrap px-3 transition-colors group-data-[state=X]:text-muted-foreground/70 group-data-[state=ALL]:text-muted-foreground/70">
                                                <LinkedinLogo size="sm" />
                                                <RadioGroupItem value="LINKEDIN" className="sr-only" />
                                            </label>
                                            <label className="relative z-10 inline-flex h-full min-w-8 cursor-pointer select-none items-center justify-center whitespace-nowrap px-3 transition-colors group-data-[state=X]:text-muted-foreground/70 group-data-[state=LINKEDIN]:text-muted-foreground/70">
                                                <span className="text-xs font-medium">ALL</span>
                                                <RadioGroupItem value="ALL" className="sr-only" />
                                            </label>
                                        </RadioGroup>
                                    </div>
                                </div>
                            </>)}

                        </div>

                        {/* Textarea */}
                        <Textarea
                            ref={textareaRef}
                            placeholder="What's on your mind?"
                            value={prompt[activeTab]}
                            onChange={(e) => setPrompt(prev => ({ ...prev, [activeTab]: e.target.value }))}
                            onPaste={handlePaste}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="min-h-20 max-h-20 resize-none! border-0 bg-transparent! text-lg placeholder:text-muted-foreground focus-visible:ring-0 shadow-none rounded-2xl leading-relaxed p-2 scroll-bar"
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
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={images.length >= 5 || uploadImageMutation.isPending}
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-accent"
                                                >
                                                    <Paperclip className="h-15 w-15 text-muted-foreground" size={15} />
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
                                                        onPressedChange={setForceWeb}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 rounded-full border-none bg-transparent"
                                                    >
                                                        <Globe className="h-15 w-15" size={15} />
                                                    </Toggle>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <span>Toggle Web Search</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-1 ml-4">
                                        <div className="inline-flex h-9 rounded-lg bg-input/50 p-0.5 max-w-[400px]">
                                            <RadioGroup
                                                value={applyOn}
                                                onValueChange={(value) => setApplyOn(value as "post" | "image")}
                                                className="group relative inline-grid grid-cols-[1fr_1fr] items-center gap-0 text-sm font-medium after:absolute after:inset-y-0 after:w-1/2 after:rounded-md after:bg-card after:shadow-sm after:shadow-black/5 after:outline-offset-2 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-[:focus-visible]:after:outline-2 has-[:focus-visible]:after:outline-ring/70 data-[state=post]:after:translate-x-0 data-[state=image]:after:translate-x-full"
                                                data-state={applyOn}
                                            >
                                                <label className="relative z-10 inline-flex h-full min-w-8 cursor-pointer select-none items-center justify-center whitespace-nowrap px-4 transition-colors group-data-[state=image]:text-muted-foreground/70">
                                                    <Text className="h-5 w-5 mr-2" />
                                                    <span>
                                                        Post
                                                    </span>
                                                    <RadioGroupItem value="post" className="sr-only" />

                                                </label>
                                                <label className="relative z-10 inline-flex h-full min-w-8 cursor-pointer select-none items-center justify-center whitespace-nowrap px-4 transition-colors group-data-[state=post]:text-muted-foreground/70">
                                                    <ImageIcon className="h-5 w-5 mr-2" />
                                                    <span>
                                                        Image
                                                    </span>
                                                    <RadioGroupItem value="image" className="sr-only" />

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
                                    !prompt[activeTab].trim() ||
                                    images.some(img => img.uploading) ||
                                    createPostMutation.isPending ||
                                    ((platform === "X" || platform === "ALL") && !selectedXAccount)
                                }
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full"
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
                            <div className="absolute inset-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center border-2 border-dashed border-primary animate-pulse pointer-events-none">
                                <div className="text-center space-y-3">
                                    <div className="relative">
                                        <ImagePlus className="h-12 w-12 text-primary mx-auto animate-bounce" />
                                        <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full animate-ping"></div>
                                    </div>
                                    <p className="text-lg font-semibold text-primary">Drop your images here</p>
                                    <p className="text-sm text-primary/70">Support JPG, PNG up to 5MB (max 5 images)</p>
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
                            You have undone some content. If you proceed, you won&apos;t be able to recover the next posts or images. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowUndoAlert(false);
                            setPendingAction(null);
                        }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setShowUndoAlert(false);
                            if (pendingAction) {
                                pendingAction();
                                setPendingAction(null);
                            }
                        }}>
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Page;