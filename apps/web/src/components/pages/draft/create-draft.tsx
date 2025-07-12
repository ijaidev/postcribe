"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, ImagePlus, X, Paperclip, Loader2, Globe } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
} from "@/components/ui/card";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { XLogo } from "@/components/ui/x-logo";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import client from "@/lib/hono-client";
import Suggestions from "@/components/pages/draft/suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { Select, SelectItem, SelectLabel, SelectGroup, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { InferRequestType } from "hono";


interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    uploaded: boolean;
    uploading: boolean;
    imageUrl?: string;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const $post = client.post.draft.$post
type DraftCreate = InferRequestType<typeof $post>['json']

export function CreateDraft({ handleCreatePost, isCreating }: { handleCreatePost: (data: DraftCreate, generateImage: boolean) => void, isCreating: boolean }) {
    


    const [prompt, setPrompt] = useState("");
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [generateImage, setGenerateImage] = useState(false);
    const [forceWeb, setForceWeb] = useState(false);
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

    const connectedAccounts = socialAccounts?.data?.filter(
        (account) => account.isConnected
    ) || [];

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

    const createPost = () => {
        let platform = "ALL";
        if (selectedPlatforms.x.selected && selectedPlatforms.linkedin.selected) {
            platform = "ALL";
        } else if (selectedPlatforms.x.selected) {
            platform = "X";
        } else if (selectedPlatforms.linkedin.selected) {
            platform = "LINKEDIN";
        }
        else {
            toast.error("Please select at least one platform");
            return;
        }
        handleCreatePost({
            message: prompt,
            platform: platform as "ALL" | "X" | "LINKEDIN",
            images: images.map(img => img.imageUrl!),
            forceWeb: forceWeb
        },
        generateImage
    );
    };
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
    }, [images]);

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

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-8">
                {/* Main Chat Interface */}
                <div className="space-y-6">
                    {/* Input */}
                    <div className="bottom-4">
                        <Card
                            className={`relative rounded-2xl border shadow-lg transition-all duration-300 p-6 ${isDragging
                                ? "border-primary shadow-2xl scale-[1.02] bg-primary/5 ring-2 ring-primary/20"
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
                            {images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {images.map((image) => (
                                        <div key={image.id} className="relative group">
                                            <Image
                                                src={image.preview}
                                                alt="Upload preview"
                                                width={64}
                                                height={64}
                                                className={`w-16 h-16 object-cover rounded-lg border-2 shadow-sm transition-opacity ${image.uploading && 'border-primary opacity-70'
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
                                                className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 text-xs"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-xs text-muted-foreground flex items-center">
                                        {images.length}/5 images
                                        {images.some(img => img.uploading) && (
                                            <span className="ml-2 text-primary">Uploading...</span>
                                        )}
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
                                        createPost();
                                    }
                                }}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className="min-h-30 max-h-30 resize-none! border-0 bg-transparent! text-lg placeholder:text-muted-foreground focus-visible:ring-0 shadow-none rounded-2xl leading-relaxed p-6"
                            />

                            {/* Bottom actions */}
                            <div className="flex items-center justify-between">
                                <TooltipProvider>
                                    <div className="flex items-center gap-3">
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
                                </TooltipProvider>

                                {/* Send button */}
                                <Button
                                    onClick={createPost}
                                    disabled={
                                        !prompt.trim() ||
                                        (!selectedPlatforms.x.selected && !selectedPlatforms.linkedin.selected) ||
                                        images.some(img => img.uploading) ||
                                        isCreating
                                    }
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full"
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

                    {/* Platform & Settings Section */}
                    <div className="flex items-center flex-row gap-4 p-2">
                        <Select
                            onValueChange={(value) => {
                                setSelectedPlatforms(prev => ({
                                    ...prev,
                                    x: { ...prev.x, accountId: value }
                                }));
                            }}
                            value={selectedPlatforms.x.accountId ?? ""}
                        >
                            <SelectTrigger className="w-[180px] items-center">
                                <SelectValue placeholder={<span className="flex items-center gap-2"><XLogo size="sm" />Select Account</span>} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {
                                        (connectedAccounts.filter(account => account.provider === "X").length > 0) ? (
                                            <>
                                                <SelectLabel>Select X Account</SelectLabel>
                                                {connectedAccounts.filter(account => account.provider === "X").map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        <div className="flex items-center gap-2">
                                                            <XLogo size="sm" />
                                                            {account.name}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                                }
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 justify-between w-full flex-col p-4">
                                                <SelectLabel>No X accounts connected</SelectLabel>
                                                <Link href="/connections" className={buttonVariants({ variant: "outline" })}>Connect X account</Link>
                                            </div>
                                        )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <div className="flex-1"></div>
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
                        <div className="flex items-center gap-2 pl-4">
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
