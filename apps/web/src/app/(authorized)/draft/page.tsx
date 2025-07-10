"use client"
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import CreateDraft from "@/components/pages/create-draft";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles, Globe, Undo2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { type PostGenStreamResponse, type Post } from "@repo/ai";
import { Allow, parse } from "partial-json";

interface StreamData extends PostGenStreamResponse {
    platform: "X" | "LINKEDIN";
    draftId: string;
}

interface PostVersion {
    post: string;
    version: number;
}

interface ImageVersion {
    url: string;
    version: number;
}

interface DraftState {
    posts: PostVersion[];
    images: ImageVersion[];
    currentPostVersion: number;
    currentImageVersion: number;
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

    const [newPrompt, setNewPrompt] = useState("");
    const [activeTab, setActiveTab] = useState("x");
    const [applyOn, setApplyOn] = useState("Post");
    const [platform, setPlatform] = useState("ALL");
    const [showUndoAlert, setShowUndoAlert] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        const draftIdFromUrl = searchParams.get('draftId');
        if (draftIdFromUrl) {
            setDraftId(draftIdFromUrl);
        }
    }, [searchParams]);

    const $post = client.post.draft.$post;
    type DraftCreate = InferRequestType<typeof $post>['json'];

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

    useEffect(() => {
        if (draftData?.data) {
            const xPosts = draftData.data.x.posts;
            const linkedinPosts = draftData.data.linkedin.posts;
            const xImages = draftData.data.x.images;
            const linkedinImages = draftData.data.linkedin.images;
            
            setDraftState({
                x: {
                    posts: xPosts.map((post, index) => ({
                        post: post.content,
                        version: post.version ?? index,
                    })) || [],
                    images: xImages || [],
                    currentPostVersion: xPosts.length > 0 ? xPosts.length - 1 : 0,
                    currentImageVersion: xImages.length > 0 ? xImages.length - 1 : 0
                },
                linkedin: {
                    posts: linkedinPosts.map((post, index) => ({
                        post: post.content,
                        version: post.version ?? index,
                    })) || [],
                    images: linkedinImages || [],
                    currentPostVersion: linkedinPosts.length > 0 ? linkedinPosts.length - 1 : 0,
                    currentImageVersion: linkedinImages.length > 0 ? linkedinImages.length - 1 : 0
                }
            });
        }
    }, [draftData]);

    // Post creation/regeneration mutation
    const createPostMutation = useMutation({
        mutationFn: async (data: DraftCreate) => {
            const response = await $post({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create post");
            }
            return response;
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
        onSuccess: async (response) => {
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
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data: StreamData = JSON.parse(line);
                            console.log(`🌊 STREAM - Raw data:`, data);

                            if (data.draftId && !receivedDraftId) {
                                receivedDraftId = data.draftId;
                                console.log(`🆔 STREAM - Draft ID received:`, data.draftId);
                                if (!draftId) {
                                    // First time creation - update URL with query param
                                    const newUrl = `/draft?draftId=${data.draftId}`;
                                    window.history.replaceState(null, '', newUrl);
                                    setDraftId(data.draftId);
                                    console.log(`🔄 STREAM - URL updated to ${newUrl}`);
                                }
                            }

                            if (data.event === "end") {
                                console.log(`🏁 STREAM - End event received for ${data.platform}`);
                                continue;
                            }

                            const platformKey = data.platform.toLowerCase() as "x" | "linkedin";
                            console.log(`🎯 STREAM - Platform: ${platformKey}, Event: ${data.event}`);

                            setCurrentEvent(prev => {
                                const newEvent = { ...prev, [platformKey]: data.event };
                                console.log(`📡 STREAM - Setting current event:`, newEvent);
                                return newEvent;
                            });

                            if (data.event === "response") {
                                console.log(`🔄 [${platformKey}] Response event:`, data.content);
                                buffer[platformKey] += data.content;
                                console.log(`📝 [${platformKey}] Buffer now:`, buffer[platformKey]);
                                
                                const parsed = parse(buffer[platformKey], Allow.ALL) as Partial<Post>;
                                const newPostContent = parsed.post || "";
                                const newOptions = parsed.options || [];
                                console.log(`✅ [${platformKey}] Parsed content:`, newPostContent);
                                console.log(`🎯 [${platformKey}] Parsed options:`, newOptions);
                                
                                // Update options if available
                                if (newOptions.length > 0) {
                                    setOptions(prev => ({
                                        ...prev,
                                        [platformKey]: newOptions
                                    }));
                                }
                                console.log(`🔄 [${platformKey}] options:`, options);
                                
                                if (newPostContent) {
                                    const isFirstTime = !hasStarted.current[platformKey];
                                    // console.log(`🎯 [${platformKey}] First time?`, isFirstTime);
                                    // console.log(`🎯 [${platformKey}] hasStarted state:`, hasStarted.current);
                                    
                                    if (isFirstTime) {
                                        hasStarted.current[platformKey] = true;
                                        // console.log(`➕ [${platformKey}] APPENDING new post`);
                                        // Append new post
                                        setDraftState(prev => {
                                            // console.log(`📊 [${platformKey}] BEFORE append - prev state:`, prev[platformKey]);
                                            const newPosts = [...prev[platformKey].posts, { post: newPostContent, version: prev[platformKey].posts.length }];
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts,
                                                    currentPostVersion: newPosts.length - 1
                                                }
                                            };
                                            // console.log(`📊 [${platformKey}] AFTER append - new state:`, newState[platformKey]);
                                            // console.log(`🔄 [${platformKey}] newPosts:`, newPosts);
                                            return newState;

                                        });
                                    } else {
                                        // console.log(`🔄 [${platformKey}] REPLACING last post`);
                                        // Replace last post
                                        setDraftState(prev => {
                                            // console.log(`📊 [${platformKey}] BEFORE replace - prev state:`, prev[platformKey]);
                                            const newPosts = [...prev[platformKey].posts];
                                            if(newPosts.length > 0) {
                                                newPosts[newPosts.length - 1] = { ...newPosts[newPosts.length - 1], post: newPostContent };
                                            }
                                            const newState = {
                                                ...prev,
                                                [platformKey]: {
                                                    ...prev[platformKey],
                                                    posts: newPosts
                                                }
                                            };
                                            // console.log(`📊 [${platformKey}] AFTER replace - new state:`, newState[platformKey]);
                                            // console.log(`🔄 [${platformKey}] newPosts:`, newPosts);
                                            return newState;
                                        });
                                    }
                                }

                                // console.log(`🔄 [${platformKey}] draftState:`, draftState);
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

    // Image generation mutation
    // const imageGenMutation = useMutation({
    //     mutationFn: async (draftId: string) => {
    //         const response = await $imageGen({ form: {
    //             id: draftId,
    //             message: "Generate an image for this post",
    //             platform: platform === "ALL" ? "all" : platform.toLowerCase(),
    //             images: [],
    //             forceWeb: false,
    //             version: draftState[activeTab as keyof typeof draftState].currentImageVersion
    //         } });
    //         if (!response.ok) {
    //             throw new Error("Failed to generate image");
    //         }
    //         return response.json();
    //     },
    //     onSuccess: (response) => {
    //         // Update draft state with new image
    //         const platformKeys = platform === "ALL" ? ["x", "linkedin"] : [platform.toLowerCase()];

    //         platformKeys.forEach(platformKey => {
    //             const imageUrl = response.data?.[platformKey === "x" ? "x" : "linkedin"];
    //             if (imageUrl) {
    //                 setDraftState(prevState => {
    //                     const currentPlatform = prevState[platformKey as keyof typeof prevState];
    //                     return {
    //                         ...prevState,
    //                         [platformKey]: {
    //                             ...currentPlatform,
    //                             images: [...currentPlatform.images, {
    //                                 url: imageUrl,
    //                                 version: currentPlatform.images.length
    //                             }],
    //                             currentImageVersion: currentPlatform.images.length
    //                         }
    //                     };
    //                 });
    //             }
    //         });
    //     }
    // });

    // const generateImage = (draftId: string) => {
    //     imageGenMutation.mutate(draftId);
    // };

    const handleCreatePost = (data: DraftCreate) => {
        createPostMutation.mutate(data);
    };

    const canUndo = (type: 'post' | 'image') => {
        const state = draftState[activeTab as keyof typeof draftState];
        if (type === 'post') {
            return state.currentPostVersion > 0;
        }
        return state.currentImageVersion > 0;
    };

    const canRedo = (type: 'post' | 'image') => {
        const state = draftState[activeTab as keyof typeof draftState];
        if (type === 'post') {
            return state.currentPostVersion < state.posts.length - 1;
        }
        return state.currentImageVersion < state.images.length - 1;
    };

    const handleUndo = (type: 'post' | 'image') => {
        const platformKey = activeTab as keyof typeof draftState;
        setDraftState(prev => ({
            ...prev,
            [platformKey]: {
                ...prev[platformKey],
                [`current${type === 'post' ? 'Post' : 'Image'}Version`]:
                    prev[platformKey][`current${type === 'post' ? 'Post' : 'Image'}Version`] - 1
            }
        }));
    };

    const handleRedo = (type: 'post' | 'image') => {
        const platformKey = activeTab as keyof typeof draftState;
        setDraftState(prev => ({
            ...prev,
            [platformKey]: {
                ...prev[platformKey],
                [`current${type === 'post' ? 'Post' : 'Image'}Version`]:
                    prev[platformKey][`current${type === 'post' ? 'Post' : 'Image'}Version`] + 1
            }
        }));
    };

    const handleSendMessage = () => {
        if (!newPrompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        const hasUndoneContent = () => {
            const state = draftState[activeTab as keyof typeof draftState];
            return (state.currentPostVersion < state.posts.length - 1) ||
                (state.currentImageVersion < state.images.length - 1);
        };

        const sendRequest = () => {
            const data: DraftCreate = {
                id: draftId!,
                message: newPrompt,
                platform: platform as "ALL" | "X" | "LINKEDIN",
                images: [],
                forceWeb: false,
                version: applyOn === "Post" ?
                    draftState[activeTab as keyof typeof draftState].currentPostVersion :
                    draftState[activeTab as keyof typeof draftState].currentImageVersion
            };

            createPostMutation.mutate(data);
            setNewPrompt("");
        };

        if (hasUndoneContent()) {
            setPendingAction(() => sendRequest);
            setShowUndoAlert(true);
        } else {
            sendRequest();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // If no draftId, show creation mode
    if (!draftId) {
        return (
            <CreateDraft handleCreatePost={handleCreatePost} isCreating={createPostMutation.isPending} />
        );
    }

    // If loading draft data, show loader
    if (isDraftLoading) {
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

    const currentState = draftState[activeTab as keyof typeof draftState];
    const currentPost = currentState?.posts[currentState.currentPostVersion];

    // Debug: Log current render state
    console.log(`🖼️ RENDER - Active tab: ${activeTab}`);
    console.log(`🖼️ RENDER - Current state for ${activeTab}:`, currentState);
    console.log(`🖼️ RENDER - Current post:`, currentPost);
    console.log(`🖼️ RENDER - Full draft state:`, draftState);

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl mx-auto py-8 space-y-6">
                {/* Platform Tabs */}
                <div className="space-y-3"></div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-4">
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
                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-medium">X Post</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUndo('post')}
                                        disabled={!canUndo('post')}
                                    >
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRedo('post')}
                                        disabled={!canRedo('post')}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {createPostMutation.isPending && !draftState.x.posts.length ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ) : draftState.x.posts[draftState.x.currentPostVersion]?.post ? (
                                <div className="whitespace-pre-wrap text-sm">
                                    {draftState.x.posts[draftState.x.currentPostVersion].post}
                                </div>
                            ) : (
                                <div className="text-muted-foreground text-sm">
                                    No post generated yet
                                </div>
                            )}

                            {currentEvent.x && (
                                <div className="mt-4 p-3 bg-muted/50 rounded">
                                    <div className="flex gap-2 mb-2">
                                        {currentEvent.x === "search" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Globe className="h-3 w-3 mr-1" />
                                                Web Search
                                            </Badge>
                                        )}
                                        {currentEvent.x === "extract" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Content Extract
                                            </Badge>
                                        )}
                                        {currentEvent.x === "response" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Generating...
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggestions */}
                            {options.x.length > 0 && !currentEvent.x && (
                                <div className="mt-4 space-y-3">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Suggestions for improvement:
                                    </div>
                                    <div className="grid gap-2">
                                        {options.x.map((option, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                className="justify-start text-left h-auto p-3 whitespace-normal"
                                                onClick={() => {
                                                    setNewPrompt(option);
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
                        </Card>
                    </TabsContent>

                    <TabsContent value="linkedin" className="mt-4">
                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-medium">LinkedIn Post</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUndo('post')}
                                        disabled={!canUndo('post')}
                                    >
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRedo('post')}
                                        disabled={!canRedo('post')}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {currentEvent.linkedin === "response" || createPostMutation.isPending && !draftState.linkedin.posts.length ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ) : draftState.linkedin.posts[draftState.linkedin.currentPostVersion]?.post ? (
                                <div className="whitespace-pre-wrap text-sm">
                                    {draftState.linkedin.posts[draftState.linkedin.currentPostVersion].post}
                                </div>
                            ) : (
                                <div className="text-muted-foreground text-sm">
                                    No post generated yet
                                </div>
                            )}

                            {currentEvent.linkedin && (
                                <div className="mt-4 p-3 bg-muted/50 rounded">
                                    <div className="flex gap-2 mb-2">
                                        {currentEvent.linkedin === "search" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Globe className="h-3 w-3 mr-1" />
                                                Web Search
                                            </Badge>
                                        )}
                                        {currentEvent.linkedin === "extract" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Content Extract
                                            </Badge>
                                        )}
                                        {currentEvent.linkedin === "response" && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Generating...
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Suggestions */}
                            {options.linkedin.length > 0 && !currentEvent.linkedin && (
                                <div className="mt-4 space-y-3">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Suggestions for improvement:
                                    </div>
                                    <div className="grid gap-2">
                                        {options.linkedin.map((option, index) => (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                className="justify-start text-left h-auto p-3 whitespace-normal"
                                                onClick={() => {
                                                    setNewPrompt(option);
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
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Bottom Controls */}
                <div className="space-y-4">
                    {/* Select Controls */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Apply on
                            </label>
                            <Select value={applyOn} onValueChange={setApplyOn}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Post">Post</SelectItem>
                                    <SelectItem value="Image">Image</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Platform
                            </label>
                            <Select value={platform} onValueChange={setPlatform}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="X">X</SelectItem>
                                    <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                                    <SelectItem value="ALL">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Chatbox */}
                    <Card className="rounded-2xl border shadow-lg p-4">
                        <div className="flex items-center gap-3">
                            <Textarea
                                ref={textareaRef}
                                placeholder="What's on your mind?"
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="min-h-12 max-h-32 resize-none border-0 bg-transparent text-base"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!newPrompt.trim() || createPostMutation.isPending}
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
                    </Card>
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
        </div>
    );
};

export default Page;