"use client";
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateDraft } from "@/components/pages/draft/create-draft";
import { DraftContent } from "@/components/pages/draft/draft-content";
import { DraftInput } from "@/components/pages/draft/draft-input";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type PostGenStreamResponse, type Post } from "@repo/ai";
import { Allow, parse } from "partial-json";
import { DraftState } from "@/components/pages/draft/types";

interface StreamData extends PostGenStreamResponse {
    platform: "X" | "LINKEDIN";
    draftId: string;
}

const Page = () => {
    const [prompt, setPrompt] = useState("");
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

    const [activeTab, setActiveTab] = useState<"x" | "linkedin">("x");

    const [isImageLoading, setIsImageLoading] = useState({
        x: false,
        linkedin: false,
    });

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

    useEffect(() => {
        if (draftData) {
            const xPosts = draftData.data?.x?.posts || [];
            const linkedinPosts = draftData.data?.linkedin?.posts || [];
            const xImages = draftData.data?.x?.images || [];
            const linkedinImages = draftData.data?.linkedin?.images || [];

            setOptions({
                x: xPosts[xPosts.length - 1]?.options || [],
                linkedin:
                    linkedinPosts[linkedinPosts.length - 1]?.options || [],
            });

            setDraftState({
                x: {
                    posts: xPosts.map((post, index) => ({
                        post: post.post,
                        version: post.version ?? index,
                    })),
                    images: xImages,
                    currentPostVersion:
                        xPosts.length > 0 ? xPosts.length - 1 : 0,
                    currentImageVersion:
                        xImages.length > 0 ? xImages.length - 1 : 0,
                },
                linkedin: {
                    posts: linkedinPosts.map((post, index) => ({
                        post: post.post,
                        version: post.version ?? index,
                    })),
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
                                platform: "ALL",
                                images: [],
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
                        imageUrl: linkedinImageUrl,
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
                        imageUrl: xImageUrl,
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

    const handleCreatePost = (
        data: DraftCreate,
        createImage: boolean = false,
    ) => {
        createPostMutation.mutate({ data, createImage });
    };

    const handleCreateImage = (platformKey: "x" | "linkedin") => {
        if (draftId) {
            createImageMutation.mutate({
                message: "create a related images for this post",
                draftId: draftId,
                platform: platformKey.toUpperCase() as "X" | "LINKEDIN",
                images: [],
            });
        }
    };

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
                        // Platform is handled in DraftInput
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
                        <DraftContent
                            platformKey="x"
                            draftState={draftState.x}
                            setDraftState={setDraftState}
                            draftId={draftId}
                            currentEvent={currentEvent.x}
                            isImageLoading={isImageLoading.x}
                            options={options.x}
                            onCreateImage={handleCreateImage}
                            onSuggestionClick={setPrompt}
                            isCreating={createPostMutation.isPending}
                        />
                    </TabsContent>

                    <TabsContent value="linkedin" className="mt-4 space-y-4">
                        <DraftContent
                            platformKey="linkedin"
                            draftState={draftState.linkedin}
                            setDraftState={setDraftState}
                            draftId={draftId}
                            currentEvent={currentEvent.linkedin}
                            isImageLoading={isImageLoading.linkedin}
                            options={options.linkedin}
                            onCreateImage={handleCreateImage}
                            onSuggestionClick={setPrompt}
                            isCreating={createPostMutation.isPending}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Draft Input */}
            <DraftInput
                draftId={draftId}
                onSendPost={data =>
                    createPostMutation.mutate({ data, createImage: false })
                }
                onSendImage={data => createImageMutation.mutate(data)}
                isCreating={createPostMutation.isPending}
                onActiveTabChange={setActiveTab}
                activeTab={activeTab}
                prompt={prompt}
                setPrompt={setPrompt}
            />
        </div>
    );
};

export default Page;
