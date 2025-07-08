"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Sparkles, ImagePlus, X, Paperclip, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
} from "@/components/ui/card";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { H2 } from "@/components/ui/headings";
import { XLogo } from "@/components/ui/x-logo";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import client from "@/lib/hono-client";
import { API_URL } from "@/config";
import Suggestions from "@/components/pages/suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import Link from "next/link";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    uploaded?: boolean;
    uploadedUrl?: string;
}

interface PlatformSelection {
    x: {
        selected: boolean;
        accountId: string | null;
    },
    linkedin: {
        selected: boolean;
        accountId: string | null;
    }
}

export default function DraftPage() {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [generateImage, setGenerateImage] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformSelection>({
        x: {
            selected: false,
            accountId: null
        },
        linkedin: {
            selected: false,
            accountId: null
        }
    });
    const [isCreating, setIsCreating] = useState(false);
    const [suggestionsTab, setSuggestionsTab] = useState<string>("x"); // Default to X tab
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load connected social accounts
    const { data: socialAccounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ["social-accounts"],
        queryFn: async () => {
            const response = await client.social.accounts.$get();
            if (!response.ok) throw new Error('Failed to fetch accounts');
            return response.json();
        },
    });

    const connectedAccounts = socialAccounts?.data?.filter(
        (account) => account.isConnected
    ) || [];

    // Image handling functions
    const createImagePreview = (file: File): UploadedImage => {
        return {
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            uploaded: false
        };
    };

    const handleFiles = (files: FileList | File[]) => {
        const newFiles = Array.from(files);

        // Check if adding these files would exceed the limit
        if (images.length + newFiles.length > 5) {
            toast.error(`You can only upload up to 5 images. Currently have ${images.length} images.`);
            return;
        }

        const validFiles = newFiles.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

            if (!isImage) {
                toast.error(`${file.name} is not an image file`);
                return false;
            }
            if (!isValidSize) {
                toast.error(`${file.name} is too large (max 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            const newImages = validFiles.map(createImagePreview);
            setImages(prev => [...prev, ...newImages]);
            toast.success(`${validFiles.length} image(s) uploaded`);
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


    // Post creation mutation
    const createPostMutation = useMutation({
        mutationFn: async () => {
            if (!prompt.trim()) {
                throw new Error("Please enter a prompt");
            }

            if (!selectedPlatforms.x.selected && !selectedPlatforms.linkedin.selected) {
                throw new Error("Please select at least one platform");
            }

            // Upload images first and get base64 URLs
            let base64Images: string[] = [];
            if (images.length > 0) {
                const uploadPromises = images.map(async (image) => {
                    const formData = new FormData();
                    formData.append('image', image.file);

                    // Make direct fetch request to upload endpoint since Hono client path is complex
                    const response = await fetch(`${API_URL}/v1/post/draft/image/upload`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to upload image: ${image.file.name}`);
                    }

                    const result = await response.json();
                    return result.data.image;
                });

                base64Images = await Promise.all(uploadPromises);
            }

            // Determine platform parameter
            const platforms = [selectedPlatforms.x.selected ? "x" : null, selectedPlatforms.linkedin.selected ? "linkedin" : null].filter(Boolean);
            let platform: string;
            if (platforms.length === 2) {
                platform = "all";
            } else if (platforms.includes("x")) {
                platform = "x";
            } else if (platforms.includes("linkedin")) {
                platform = "linkedin";
            } else {
                throw new Error("No valid platforms selected");
            }

            // Create form data with proper structure
            const formData = new FormData();
            formData.append("message", prompt);
            formData.append("platform", platform);
            formData.append("forceWeb", "false");

            // Add base64 images as individual form entries
            base64Images.forEach((base64Image) => {
                formData.append("images", base64Image);
            });

            const response = await fetch(`${API_URL}/v1/post/draft`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error("Failed to create post");
            }

            return response;
        },
        onSuccess: async (response) => {
            setIsCreating(true);

            // Parse the streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response stream available");
            }

            const decoder = new TextDecoder();
            let draftId = "";

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.draftId && !draftId) {
                                draftId = data.draftId;
                            }
                        } catch {
                            // Ignore JSON parse errors for streaming chunks
                        }
                    }
                }

                if (draftId) {
                    toast.success("Post created successfully!");
                    router.push(`/draft/${draftId}`);
                } else {
                    throw new Error("No draft ID received");
                }
            } catch (error) {
                console.error("Streaming error:", error);
                throw new Error("Failed to process response");
            }
        },
        onError: (error) => {
            setIsCreating(false);
            toast.error(error.message || "Failed to create post");
        }
    });

    const handleCreatePost = () => {
        createPostMutation.mutate();
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [prompt]);

    useEffect(() => {
        if (socialAccounts && socialAccounts.data && socialAccounts.data.length > 0) {
            setSelectedPlatforms(prev => ({
                ...prev,
                x: { ...prev.x, accountId: socialAccounts?.data?.[0]?.id ?? null }
            }));
        }
    }, [socialAccounts]);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(image => URL.revokeObjectURL(image.preview));
        };
    }, []);

    if (isLoadingAccounts) {
        return (
            <div className="container max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-center py-12">
                    <ThreeDotLoader size="lg" />
                    <span className="ml-3 text-muted-foreground">Loading accounts...</span>
                </div>
            </div>
        );
    }

    if (isCreating) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="w-full max-w-md p-8">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <H2>Creating Your Post</H2>
                        <p className="text-muted-foreground">
                            AI is generating your content...
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-8">
                {/* Main Chat Interface */}
                <div className="space-y-6">
                    {/* Input */}
                    <div className="sticky bottom-4">
                        <Card
                            className={`relative rounded-2xl border shadow-lg transition-all duration-300 p-6 ${isDragging
                                ? "border-primary shadow-2xl scale-[1.02] bg-primary/5 ring-2 ring-primary/20"
                                : "border-border hover:shadow-xl"
                                }`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileInput}
                                className="hidden"
                            />

                            {/* Images at top of card */}
                            {images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {images.map((image) => (
                                        <div key={image.id} className="relative group">
                                            <img
                                                src={image.preview}
                                                alt="Upload preview"
                                                className="w-16 h-16 object-cover rounded-lg border-2 border-border shadow-sm"
                                            />
                                            <button
                                                onClick={() => removeImage(image.id)}
                                                className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 text-xs"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-xs text-muted-foreground flex items-center">
                                        {images.length}/5 images
                                    </div>
                                </div>
                            )}

                            {/* Textarea */}
                            <Textarea
                                ref={textareaRef}
                                placeholder="What's on your mind?"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onPaste={handlePaste}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        handleCreatePost();
                                    }
                                }}
                                className="min-h-[120px] max-h-[300px] resize-none border-0 bg-transparent! text-lg placeholder:text-muted-foreground focus-visible:ring-0 shadow-none rounded-2xl overflow-hidden leading-relaxed p-6 pb-16 "
                            />

                            {/* Bottom actions */}
                            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Attach button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={images.length >= 5}
                                        className="h-8 w-8 p-0 rounded-full hover:bg-muted/60"
                                    >
                                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                                    </Button>


                                </div>

                                {/* Send button */}
                                <Button
                                    onClick={handleCreatePost}
                                    disabled={!prompt.trim() || !selectedPlatforms.x.selected || !selectedPlatforms.linkedin.selected || createPostMutation.isPending}
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
                                <div className="absolute inset-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center border-2 border-dashed border-primary animate-pulse">
                                    <div className="text-center space-y-3">
                                        <div className="relative">
                                            <ImagePlus className="h-12 w-12 text-primary mx-auto animate-bounce" />
                                            <div className="absolute inset-0 h-12 w-12 bg-primary/20 rounded-full animate-ping"></div>
                                        </div>
                                        <p className="text-lg font-semibold text-primary">Drop your images here</p>
                                        <p className="text-sm text-primary/70">Support JPG, PNG, GIF up to 10MB (max 5 images)</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Platform & Settings Section */}
                    <div className="flex items-start flex-row gap-4 p-2">
                        <div className="flex items-center gap-1 flex-col min-h-10">
                            <div className="flex items-center gap-2 flex-row">
                                <Checkbox id="x/twitter"
                                    checked={selectedPlatforms.x.selected}
                                    onCheckedChange={(checked) => {
                                        setSelectedPlatforms(prev => ({
                                            ...prev,
                                            x: { ...prev.x, selected: checked === "indeterminate" ? false : checked }
                                        }));
                                    }}
                                />
                                <Label htmlFor="x/twitter">X (Twitter)</Label>
                            </div>
                            {selectedPlatforms.x.selected && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <span className="text-xs w-full underline underline-offset-4 text-muted-foreground text-right hover:cursor-pointer hover:text-primary">{connectedAccounts.find(account => account.id === selectedPlatforms.x.accountId)?.name ?? "Select Account"}</span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="center">
                                        <DropdownMenuLabel>Select Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            {
                                                connectedAccounts.length === 0 ? (
                                                    <>
                                                        <DropdownMenuItem className="hover:bg-transparent!">
                                                            <p className="text-sm text-muted-foreground">
                                                                No accounts found. Please connect an account to get started.
                                                            </p>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="hover:bg-transparent!">
                                                            <Link href="/connections" className={buttonVariants({ variant: "outline" })}> Connect Account </Link>
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    connectedAccounts.filter(account => account.provider === "X").map(account => (
                                                        <DropdownMenuItem key={account.id} onClick={() => setSelectedPlatforms(prev => ({
                                                            ...prev,
                                                            x: { ...prev.x, accountId: account.id }
                                                        }))}>
                                                            <XLogo size="sm" />
                                                            {account.name}
                                                        </DropdownMenuItem>
                                                    )))
                                            }

                                        </DropdownMenuGroup>

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="linkedin"
                                checked={selectedPlatforms.linkedin.selected}
                                onCheckedChange={(checked) => {
                                    setSelectedPlatforms(prev => ({
                                        ...prev,
                                        linkedin: { ...prev.linkedin, selected: checked === "indeterminate" ? false : checked }
                                    }));
                                }}
                            />
                            <Label htmlFor="linkedin">LinkedIn</Label>
                        </div>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-2">
                            <Switch id="generateImage"
                                checked={generateImage}
                                onCheckedChange={setGenerateImage}
                            />
                            <Label htmlFor="generateImage">Generate images</Label>
                        </div>
                    </div>

                    {/* AI Suggestions with Tabs */}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Suggestions for you</span>
                        </div>

                        <Tabs value={suggestionsTab} onValueChange={setSuggestionsTab} className="w-full gap-4">
                            <TabsList className="grid w-full grid-cols-2 bg-transparent">
                                <TabsTrigger
                                    value="x"
                                    className="flex items-center gap-2 p-3 hover:cursor-pointer hover:bg-background"
                                >
                                    <XLogo size="2xl" />
                                    X (Twitter)
                                </TabsTrigger>
                                <TabsTrigger
                                    value="linkedin"
                                    className="flex items-center gap-2"
                                >
                                    <LinkedinLogo size="2xl" />
                                    LinkedIn
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="x" className="mt-4">
                                {selectedPlatforms.x.accountId ? (
                                    <Suggestions socialLoginId={selectedPlatforms.x.accountId} autoLoad={true} setPrompt={setPrompt} />
                                ) : (
                                    <Card className="p-4">
                                        <p className="text-sm text-muted-foreground">
                                            Please select an account to get post suggestions.
                                        </p>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="linkedin" className="mt-4">
                                <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">
                                        LinkedIn suggestions are not available yet. Coming soon!
                                    </p>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
