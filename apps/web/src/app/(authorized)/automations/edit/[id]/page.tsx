"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import {
    Globe,
    Sparkles,
    Loader2,
    ImagePlus,
    X,
    Paperclip,
    Settings,
    CalendarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { H1 } from "@/components/ui/headings";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { TimePicker12 } from "@/components/ui/time-picker/time-picker-12h";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import client from "@/lib/hono-client";
import { InferRequestType } from "hono";
import Image from "next/image";

interface UploadedImage {
    id: string;
    file?: File;
    preview: string;
    uploaded: boolean;
    uploading: boolean;
    imageUrl?: string;
}

type EditCronRequest = InferRequestType<typeof client.post.cron.$put>["json"];

export default function EditAutomationPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    // State management
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showImageInstructionsDialog, setShowImageInstructionsDialog] =
        useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined,
    );
    const [selectedTime, setSelectedTime] = useState<Date | undefined>(
        new Date(),
    );
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [repeatInterval, setRepeatInterval] = useState(1);
    const [repeatIntervalUnit, setRepeatIntervalUnit] = useState<
        "HOUR" | "DAY" | "WEEK" | "MONTH"
    >("DAY");
    const [generateImage, setGenerateImage] = useState(false);
    const [imagePrompt, setImagePrompt] = useState("");
    const [forceWeb, setForceWeb] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState({
        x: { selected: false },
        linkedin: { selected: false },
    });

    // Image upload mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (image: UploadedImage) => {
            if (!image.file) throw new Error("No file to upload");
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

    const automation = useQuery({
        queryKey: ["automation", id],
        queryFn: async () => {
            const res = await client.post.cron[":id"].$get({ param: { id } });
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            return data.data;
        },
        enabled: !!id,
    });

    const didPrefill = useRef(false);

    useEffect(() => {
        if (!id || automation.isLoading || automation.isError) return;
        if (!automation.data || didPrefill.current) return;
        const a = automation.data;
        if (!a) throw new Error("No automation found");
        setTitle(a.title || "");
        setMessage(a.PostCronData?.message || "");
        setRepeatInterval(a.repeatInterval);
        setRepeatIntervalUnit(a.repeatIntervalUnit);
        setGenerateImage(!!a.PostCronData?.generateImage);
        setImagePrompt(a.PostCronData?.imagePrompt || "");
        setForceWeb(!!a.PostCronData?.forceWeb);
        setSelectedPlatforms({
            x: {
                selected:
                    a.PostCronData?.platform === "X" ||
                    a.PostCronData?.platform === "ALL",
            },
            linkedin: {
                selected:
                    a.PostCronData?.platform === "LINKEDIN" ||
                    a.PostCronData?.platform === "ALL",
            },
        });
        if (a.scheduledAt) {
            const dt = new Date(a.scheduledAt);
            setSelectedDate(dt);
            setSelectedTime(dt);
        }
        if (
            a.PostCronData?.inputImages &&
            a.PostCronData.inputImages.length > 0
        ) {
            setImages(
                a.PostCronData.inputImages.map(url => ({
                    id: url,
                    file: undefined,
                    preview: url,
                    uploaded: true,
                    uploading: false,
                    imageUrl: url,
                })),
            );
        }
        didPrefill.current = true;
    }, [automation.data, id, automation.isLoading, automation.isError]);

    // Edit automation mutation
    const editAutomationMutation = useMutation({
        mutationFn: async (data: EditCronRequest) => {
            const response = await client.post.cron.$put({ json: data });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update automation");
            }
            return response.json();
        },
        onSuccess: data => {
            queryClient.setQueryData(["automation", id], data.data);
            toast.success("Automation updated successfully!");
            router.push("/automations");
        },
        onError: error => {
            toast.error(error.message || "Failed to update automation");
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
                file.type === "image/jpeg" ||
                file.type === "image/png" ||
                file.type === "image/webp";
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

    const editAutomation = () => {
        if (message.trim().length < 20) {
            toast.error("Message must be at least 20 characters long");
            return;
        }
        if (
            !selectedPlatforms.x.selected &&
            !selectedPlatforms.linkedin.selected
        ) {
            toast.error("Please select at least one platform");
            return;
        }
        if (imagePrompt.trim().length < 10 && generateImage && imagePrompt) {
            toast.error("Image prompt must be at least 10 characters long");
            return;
        }
        if (!title || !selectedDate) {
            toast.error("Please fill in all required fields");
            return;
        }
        let platform: "ALL" | "X" | "LINKEDIN" = "ALL";
        if (
            selectedPlatforms.x.selected &&
            selectedPlatforms.linkedin.selected
        ) {
            platform = "ALL";
        } else if (selectedPlatforms.x.selected) {
            platform = "X";
        } else if (selectedPlatforms.linkedin.selected) {
            platform = "LINKEDIN";
        }
        const imageUrls = images
            .filter(img => img.uploaded && img.imageUrl)
            .map(img => img.imageUrl!);
        const combinedDateTime = new Date(selectedDate);
        if (selectedTime) {
            combinedDateTime.setHours(selectedTime.getHours());
            combinedDateTime.setMinutes(selectedTime.getMinutes());
        }
        const automationData: EditCronRequest = {
            id,
            title,
            scheduledAt: combinedDateTime.toISOString(),
            repeatInterval,
            repeatIntervalUnit,
            message,
            platform,
            inputImages: imageUrls.length > 0 ? imageUrls : undefined,
            generateImage,
            imagePrompt: imagePrompt || undefined,
            forceWeb,
        };
        editAutomationMutation.mutate(automationData);
    };

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(image => URL.revokeObjectURL(image.preview));
        };
    }, [images]);

    if (automation.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span className="text-muted-foreground text-lg">
                    Loading automation...
                </span>
            </div>
        );
    }
    if (automation.isError) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <span className="text-destructive text-lg">
                    {automation.error.message || "Failed to load automation"}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-4xl py-8">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <div>
                        <H1>Create Automation</H1>
                        <p className="text-muted-foreground">
                            Set up automated social media posts that run on a
                            schedule
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Title Input */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Automation Title
                            </CardTitle>
                            <CardDescription>
                                Give your automation a descriptive name
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input
                                placeholder="e.g., Weekly Tech Updates"
                                className="text-lg"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    {/* Main Chat Interface */}
                    <div className="space-y-6">
                        {/* Input */}
                        <div className="bottom-4">
                            <Card
                                className={`relative rounded-2xl border p-6 shadow-lg transition-all duration-300 ${
                                    isDragging
                                        ? "border-primary bg-primary/5 ring-primary/20 scale-[1.02] shadow-2xl ring-2"
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
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {images.map(image => (
                                            <div
                                                key={image.id}
                                                className="group relative"
                                            >
                                                <Image
                                                    src={image.preview}
                                                    alt="Upload preview"
                                                    width={64}
                                                    height={64}
                                                    className={`h-16 w-16 rounded-lg border-2 object-cover shadow-sm transition-opacity ${
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
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 absolute -top-1 -right-1 rounded-full p-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="text-muted-foreground flex items-center text-xs">
                                            {images.length}/5 images
                                            {images.some(
                                                img => img.uploading,
                                            ) && (
                                                <span className="text-primary ml-2">
                                                    Uploading...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Textarea */}
                                <Textarea
                                    placeholder="Tell me what kind of content you want to create automatically..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onPaste={handlePaste}
                                    onKeyDown={e => {
                                        if (
                                            e.key === "Enter" &&
                                            (e.metaKey || e.ctrlKey)
                                        ) {
                                            e.preventDefault();
                                            editAutomation();
                                        }
                                    }}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    className="placeholder:text-muted-foreground scroll-bar-2 max-h-30 min-h-30 resize-none! rounded-2xl border-0 bg-transparent! p-6 text-lg leading-relaxed shadow-none focus-visible:ring-0"
                                />

                                {/* Bottom actions */}
                                <div className="flex items-center justify-start">
                                    <TooltipProvider>
                                        <div className="flex items-center gap-3">
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
                                                            images.length >=
                                                                5 ||
                                                            editAutomationMutation.isPending
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
                                                    <span>
                                                        Toggle Web Search
                                                    </span>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TooltipProvider>
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
                                                Support JPG, PNG up to 5MB (max
                                                5 images)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Platform & Settings Section */}
                        <div className="flex flex-row items-center gap-4 p-2">
                            <div className="flex flex-row items-center gap-2">
                                <Checkbox
                                    id="x/twitter"
                                    checked={selectedPlatforms.x.selected}
                                    onCheckedChange={checked => {
                                        setSelectedPlatforms(prev => ({
                                            ...prev,
                                            x: {
                                                ...prev.x,
                                                selected:
                                                    checked === "indeterminate"
                                                        ? false
                                                        : checked,
                                            },
                                        }));
                                    }}
                                />
                                <Label htmlFor="x/twitter">X (Twitter)</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="linkedin"
                                    checked={
                                        selectedPlatforms.linkedin.selected
                                    }
                                    onCheckedChange={checked => {
                                        setSelectedPlatforms(prev => ({
                                            ...prev,
                                            linkedin: {
                                                ...prev.linkedin,
                                                selected:
                                                    checked === "indeterminate"
                                                        ? false
                                                        : checked,
                                            },
                                        }));
                                    }}
                                />
                                <Label htmlFor="linkedin">LinkedIn</Label>
                            </div>
                            <div className="flex items-center gap-2 pl-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="generateImage"
                                        checked={generateImage}
                                        onCheckedChange={setGenerateImage}
                                    />
                                    <Label htmlFor="generateImage">
                                        Generate images
                                    </Label>
                                </div>
                            </div>
                            <div className="flex-1"></div>
                            <Dialog
                                open={showImageInstructionsDialog}
                                onOpenChange={setShowImageInstructionsDialog}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <Settings className="h-4 w-4" />
                                        <span className="mb-0.5">
                                            Image Instructions
                                        </span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>
                                            Custom Image Instructions
                                        </DialogTitle>
                                        <DialogDescription>
                                            Provide custom instructions for
                                            image generation (optional)
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Textarea
                                            placeholder="Provide custom instructions for image, like styling, theme, etc. For example: 'Create images with a modern, minimalist style using blue and white colors, with clean typography and professional layout'"
                                            value={imagePrompt}
                                            onChange={e =>
                                                setImagePrompt(e.target.value)
                                            }
                                            className="min-h-[120px]"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setShowImageInstructionsDialog(
                                                    false,
                                                )
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                setShowImageInstructionsDialog(
                                                    false,
                                                )
                                            }
                                        >
                                            Save Instructions
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Schedule Settings */}
                    <Card className="relative">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Schedule Settings
                            </CardTitle>
                            <CardDescription>
                                Configure when and how often to run this
                                automation
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Date & Time Section */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">
                                            Start Date
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="h-12 w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {selectedDate ? (
                                                        format(
                                                            selectedDate,
                                                            "PPP",
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            Pick a date
                                                        </span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={setSelectedDate}
                                                    disabled={date =>
                                                        date <
                                                        new Date(
                                                            new Date().setHours(
                                                                0,
                                                                0,
                                                                0,
                                                                0,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-muted-foreground text-sm">
                                            When should this automation start
                                            running?
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">
                                            Start Time
                                        </Label>
                                        <TimePicker12
                                            date={selectedTime}
                                            setDate={setSelectedTime}
                                        />
                                        <p className="text-muted-foreground text-sm">
                                            What time should it run?
                                        </p>
                                    </div>
                                </div>

                                {/* Repeat Interval Section */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-base font-medium">
                                                Repeat Every
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                className="h-12"
                                                value={repeatInterval}
                                                onChange={e =>
                                                    setRepeatInterval(
                                                        parseInt(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-base font-medium">
                                                Unit
                                            </Label>
                                            <Select
                                                onValueChange={(
                                                    value:
                                                        | "HOUR"
                                                        | "DAY"
                                                        | "WEEK"
                                                        | "MONTH",
                                                ) =>
                                                    setRepeatIntervalUnit(value)
                                                }
                                                defaultValue={
                                                    repeatIntervalUnit
                                                }
                                            >
                                                <SelectTrigger className="h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="HOUR">
                                                        Hours
                                                    </SelectItem>
                                                    <SelectItem value="DAY">
                                                        Days
                                                    </SelectItem>
                                                    <SelectItem value="WEEK">
                                                        Weeks
                                                    </SelectItem>
                                                    <SelectItem value="MONTH">
                                                        Months
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Create Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={editAutomation}
                            disabled={editAutomationMutation.isPending}
                            className="px-8"
                            size="lg"
                        >
                            {editAutomationMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
