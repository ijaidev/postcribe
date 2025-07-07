"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { 
    Copy, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    Check,
    AlertTriangle,
    Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { H1, H2 } from "@/components/ui/headings";
import { XLogo } from "@/components/ui/x-logo"; 
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import client from "@/lib/hono-client";

interface Post {
    content: string;
    version: number;
}

interface Image {
    url: string;
    version: number;
}

interface PostData {
    x: {
        posts: Post[];
        images: Image[];
    };
    linkedin: {
        posts: Post[];
        images: Image[];
    };
}

type EditType = "Text" | "Image";
type Platform = "x" | "linkedin";

export default function DraftEditPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const draftId = params.id as string;
    
    const [activeTab, setActiveTab] = useState<Platform>("x");
    const [editType, setEditType] = useState<EditType>("Text");
    const [targetPlatform, setTargetPlatform] = useState<Platform>("x");
    const [selectedPostVersion, setSelectedPostVersion] = useState(0);
    const [selectedImageVersion, setSelectedImageVersion] = useState(0);
    const [editedContent, setEditedContent] = useState("");
    const [isApplying, setIsApplying] = useState(false);

    // Load draft posts data
    const { data: postsData, isLoading: isLoadingPosts, error } = useQuery({
        queryKey: ["draft-posts", draftId],
        queryFn: async () => {
            const response = await client.post.draft.posts.$get({
                query: { draftId }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }
            const result = await response.json();
            return result.data as PostData;
        },
        enabled: !!draftId,
    });

    // Initialize edit content when tab or version changes
    useEffect(() => {
        if (postsData && editType === "Text") {
            const posts = postsData[activeTab]?.posts || [];
            const currentPost = posts[selectedPostVersion];
            if (currentPost) {
                setEditedContent(currentPost.content);
            }
        }
    }, [postsData, activeTab, selectedPostVersion, editType]);

    // Update selected versions when switching tabs
    useEffect(() => {
        setSelectedPostVersion(0);
        setSelectedImageVersion(0);
    }, [activeTab]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard!");
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    const downloadImage = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
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

    const applyChangesMutation = useMutation({
        mutationFn: async () => {
            // This would integrate with the post update API
            // For now, we'll simulate the API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (editType === "Text") {
                // Update post content logic would go here
                // We would call an API to update the specific post version
                return { success: true };
            } else {
                // Update image logic would go here
                return { success: true };
            }
        },
        onMutate: () => {
            setIsApplying(true);
        },
        onSuccess: () => {
            setIsApplying(false);
            toast.success("Changes applied successfully!");
            // Refresh the posts data
            queryClient.invalidateQueries({ queryKey: ["draft-posts", draftId] });
        },
        onError: () => {
            setIsApplying(false);
            toast.error("Failed to apply changes");
        }
    });

    const handleApplyChanges = () => {
        applyChangesMutation.mutate();
    };

    if (isLoadingPosts) {
        return (
            <div className="container max-w-6xl mx-auto py-8">
                <div className="flex items-center justify-center py-12">
                    <ThreeDotLoader size="lg" />
                    <span className="ml-3 text-muted-foreground">Loading posts...</span>
                </div>
            </div>
        );
    }

    if (error || !postsData) {
        return (
            <div className="container max-w-6xl mx-auto py-8">
                <Card className="p-8 text-center">
                    <H2>Draft Not Found</H2>
                    <p className="text-muted-foreground mb-4">
                        The requested draft could not be found.
                    </p>
                    <Button asChild>
                        <a href="/draft">Create New Draft</a>
                    </Button>
                </Card>
            </div>
        );
    }

    const currentPosts = postsData[activeTab]?.posts || [];
    const currentImages = postsData[activeTab]?.images || [];
    const currentPost = currentPosts[selectedPostVersion];
    const currentImage = currentImages[selectedImageVersion];

    return (
        <div className="container max-w-6xl mx-auto py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <H1>Edit Draft</H1>
                    <p className="text-muted-foreground">
                        Fine-tune your content for each platform
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <a href="/draft">Create New Draft</a>
                </Button>
            </div>

            {/* Platform Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Platform)}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="x" className="flex items-center gap-2">
                        <XLogo size="sm" />
                        X (Twitter)
                    </TabsTrigger>
                    <TabsTrigger value="linkedin" className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                            in
                        </span>
                        LinkedIn
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="x" className="space-y-6">
                    {renderPlatformContent("x", currentPosts, currentImages, currentPost, currentImage)}
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-6">
                    {renderPlatformContent("linkedin", currentPosts, currentImages, currentPost, currentImage)}
                </TabsContent>
            </Tabs>

            {/* Edit Controls */}
            <Card className="p-6">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-4">
                        <span>Edit Content</span>
                        <div className="flex items-center gap-4">
                            {/* Edit Type Selection */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="edit-type">Edit Type:</Label>
                                <Select value={editType} onValueChange={(value: EditType) => setEditType(value)}>
                                    <SelectTrigger id="edit-type" className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Text">Text</SelectItem>
                                        <SelectItem value="Image">Image</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Platform Selection */}
                            <div className="flex items-center gap-2">
                                <Label htmlFor="target-platform">Apply to:</Label>
                                <Select value={targetPlatform} onValueChange={(value: Platform) => setTargetPlatform(value)}>
                                    <SelectTrigger id="target-platform" className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="x">X (Twitter)</SelectItem>
                                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent className="px-0 space-y-4">
                    {editType === "Text" ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="edit-content">Edit Text Content</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(editedContent)}
                                    className="flex items-center gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copy
                                </Button>
                            </div>
                            
                            <Textarea
                                id="edit-content"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="min-h-[200px]"
                                placeholder="Edit your post content here..."
                            />

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {editedContent.length}/280 characters
                                </span>
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            disabled={!editedContent.trim() || isApplying}
                                            className="flex items-center gap-2"
                                        >
                                            {isApplying ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                            Apply Changes
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                                Apply Changes
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will apply your changes to the {targetPlatform.toUpperCase()} post. 
                                                Any newer versions after this one will be lost. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={handleApplyChanges}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Apply Changes
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center space-y-4">
                                {currentImage ? (
                                    <div className="space-y-4">
                                        <img
                                            src={currentImage.url}
                                            alt={`Generated image version ${currentImage.version}`}
                                            className="max-w-md mx-auto rounded-lg border shadow-sm"
                                        />
                                        
                                        <div className="flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => downloadImage(
                                                    currentImage.url,
                                                    `image-${activeTab}-v${currentImage.version}.png`
                                                )}
                                                className="flex items-center gap-2"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        disabled={isApplying}
                                                        className="flex items-center gap-2"
                                                    >
                                                        {isApplying ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                        Apply This Version
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2">
                                                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                                            Apply Image Version
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will set this image as the current version for {targetPlatform.toUpperCase()}. 
                                                            Any newer versions after this one will be lost. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={handleApplyChanges}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Apply Version
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">No images available for this platform</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    function renderPlatformContent(platform: Platform, posts: Post[], images: Image[], currentPost: Post, currentImage: Image) {
        return (
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Posts Section */}
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="flex items-center justify-between">
                            <span>Text Posts</span>
                            {posts.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedPostVersion(Math.max(0, selectedPostVersion - 1))}
                                        disabled={selectedPostVersion === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedPostVersion + 1} / {posts.length}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedPostVersion(Math.min(posts.length - 1, selectedPostVersion + 1))}
                                        disabled={selectedPostVersion === posts.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="px-0 space-y-4">
                        {currentPost ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="whitespace-pre-wrap">{currentPost.content}</p>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Version {currentPost.version}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(currentPost.content)}
                                        className="flex items-center gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No posts available for this platform
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Images Section */}
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="flex items-center justify-between">
                            <span>Generated Images</span>
                            {images.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedImageVersion(Math.max(0, selectedImageVersion - 1))}
                                        disabled={selectedImageVersion === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedImageVersion + 1} / {images.length}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedImageVersion(Math.min(images.length - 1, selectedImageVersion + 1))}
                                        disabled={selectedImageVersion === images.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="px-0 space-y-4">
                        {currentImage ? (
                            <div className="space-y-4">
                                <img
                                    src={currentImage.url}
                                    alt={`Generated image version ${currentImage.version}`}
                                    className="w-full rounded-lg border shadow-sm"
                                />
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Version {currentImage.version}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadImage(
                                            currentImage.url,
                                            `image-${platform}-v${currentImage.version}.png`
                                        )}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No images available for this platform
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }
} 