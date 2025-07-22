"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { H2, Subtitle } from "@/components/ui/headings";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import {
    CalendarIcon,
    Repeat,
    Clock,
    ArrowRight,
    Trash2,
    Pencil,
} from "lucide-react";
import Link from "next/link";
import client from "@/lib/hono-client";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { InferResponseType } from "hono";

function getPlatformIcon(platform: string) {
    switch (platform) {
        case "X":
            return <XLogo size="md" className="text-blue-500" />;
        case "LINKEDIN":
            return <LinkedinLogo size="md" className="text-blue-700" />;
        case "ALL":
            return (
                <div className="flex items-center gap-4">
                    <XLogo size="sm" className="text-blue-500" />
                    <LinkedinLogo size="sm" className="text-blue-700" />
                </div>
            );
        default:
            return null;
    }
}

function getRepeatUnit(unit: string) {
    switch (unit) {
        case "HOUR":
            return "Hour(s)";
        case "DAY":
            return "Day(s)";
        case "WEEK":
            return "Week(s)";
        case "MONTH":
            return "Month(s)";
        default:
            return unit;
    }
}

type Automation = NonNullable<
    InferResponseType<typeof client.post.crons.$get>["data"]
>[number];

export default function AutomationDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();
    // Fetch automation details
    const automationQuery = useQuery({
        queryKey: ["automation", id],
        queryFn: async () => {
            const res = await client.post.cron[":id"].$get({ param: { id } });
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            return data.data;
        },
        enabled: !!id,
    });

    // Fetch drafts for this automation
    const draftsQuery = useQuery({
        queryKey: ["drafts", id],
        queryFn: async () => {
            const res = await client.post.drafts.$get({
                query: { cronId: id },
            });
            if (!res.ok) throw new Error("Failed to fetch drafts");
            const data = await res.json();
            if (!data.data || !data.data.drafts) return [];
            return data.data.drafts;
        },
        enabled: !!id,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await client.post.cron[":id"].$delete({
                param: { id },
            });
            if (!res.ok) throw new Error("Failed to delete automation");
            return { id };
        },
        onSuccess: ({ id }) => {
            toast.success("Automation deleted");
            queryClient.setQueryData(
                ["automations"],
                (oldData: { data: Automation[] }) => {
                    if (!oldData) return oldData;
                    return { data: oldData.data.filter(a => a.id !== id) };
                },
            );
            router.push("/automations");
        },
        onError: err => {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to delete automation",
            );
        },
    });

    // Toggle active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({
            id,
            isActive,
        }: {
            id: string;
            isActive: boolean;
        }) => {
            const res = await client.post.cron.$put({ json: { id, isActive } });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: ({ data }) => {
            toast.success("Status updated");
            queryClient.setQueryData(
                ["automations"],
                (oldData: { data: Automation[] }) => {
                    if (!oldData) return oldData;
                    const newData = oldData.data.map(a =>
                        a.id === data?.id
                            ? { ...a, isActive: data?.isActive }
                            : a,
                    );
                    return { data: newData };
                },
            );
            queryClient.setQueryData(
                ["automation", id],
                (oldData: Automation) => {
                    if (!oldData) return oldData;
                    return { ...oldData, isActive: data?.isActive };
                },
            );
        },
        onError: err => {
            toast.error(
                err instanceof Error ? err.message : "Failed to update status",
            );
            console.error(err);
        },
    });

    if (automationQuery.isLoading || draftsQuery.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <ThreeDotLoader size="lg" />
                <span className="text-muted-foreground ml-2 text-lg">
                    Loading...
                </span>
            </div>
        );
    }
    if (automationQuery.isError) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Alert variant="destructive">
                    <AlertDescription>
                        {automationQuery.error.message ||
                            "Failed to load automation"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    if (draftsQuery.isError) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Alert variant="destructive">
                    <AlertDescription>
                        {draftsQuery.error.message || "Failed to load drafts"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const a = automationQuery.data;
    if (!a) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Alert variant="destructive">
                    <AlertDescription>Automation not found.</AlertDescription>
                </Alert>
            </div>
        );
    }
    const drafts = draftsQuery.data || [];
    const {
        PostCronData,
        isActive,
        scheduledAt,
        repeatInterval,
        repeatIntervalUnit,
        nextRunAt,
    } = a;
    const { platform } = PostCronData;
    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-2xl py-8">
                {/* Automation Details Card */}
                <Card
                    key={id}
                    className="group bg-card/50 flex flex-col rounded-xl border-0 p-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
                >
                    {/* Header: Title only */}
                    <CardHeader className="flex flex-col pt-6 pb-0!">
                        <div className="flex w-full items-center justify-between gap-4">
                            <CardTitle className="text-foreground line-clamp-1 max-w-[300px] truncate text-lg font-semibold">
                                <Link
                                    href={`/automations/${id}`}
                                    className="hover:underline"
                                >
                                    {a.title}
                                </Link>
                            </CardTitle>
                            <Switch
                                checked={isActive}
                                disabled={
                                    toggleActiveMutation.isPending ||
                                    deleteMutation.isPending
                                }
                                onCheckedChange={() =>
                                    toggleActiveMutation.mutate({
                                        id,
                                        isActive: !isActive,
                                    })
                                }
                                aria-label={
                                    isActive ? "Set inactive" : "Set active"
                                }
                                className="data-[state=checked]:bg-green-500"
                            />
                        </div>
                        <div className="mt-6 mb-2 flex w-full items-center justify-between gap-4">
                            {/* Image Gen Indicator */}
                            <div className="text-muted-foreground -ml-1 flex items-center justify-center gap-2 rounded-full border px-4 py-0.5 text-xs">
                                <span className="mb-0.5">Generate Image</span>
                                <span
                                    className={`relative flex h-2 w-2 items-center justify-center`}
                                >
                                    <span
                                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${PostCronData?.generateImage ? "bg-green-400" : "bg-red-400"}`}
                                    ></span>
                                    <span
                                        className={`relative inline-flex h-2 w-2 rounded-full ${PostCronData?.generateImage ? "bg-green-500" : "bg-red-500"}`}
                                    ></span>
                                </span>
                            </div>

                            {getPlatformIcon(platform)}
                        </div>
                        <Separator />
                    </CardHeader>
                    {/* Main Content: Schedule Info */}
                    <CardContent className="space-y-3 px-6 py-4">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                                Starts:{" "}
                                {scheduledAt
                                    ? format(new Date(scheduledAt), "PPP p")
                                    : "-"}
                            </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Repeat className="h-4 w-4" />
                            <span>
                                Every {repeatInterval}{" "}
                                {getRepeatUnit(repeatIntervalUnit)}
                            </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>
                                Next{" "}
                                {nextRunAt
                                    ? format(new Date(nextRunAt), "PPP p")
                                    : "-"}
                            </span>
                        </div>
                        {PostCronData.message && (
                            <div className="text-muted-foreground/80 border-border mt-2 border-l-2 pl-3 text-xs italic">
                                {PostCronData.message.slice(0, 140)}
                                {PostCronData.message.length > 100 && "..."}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="justify-between p-6">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="text-destructive"
                                onClick={() => setIsDialogOpen(true)}
                                aria-label="Delete automation"
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </Button>
                            <Link
                                href={`/automations/edit/${id}`}
                                aria-label="Edit automation"
                                className={buttonVariants({
                                    variant: "outline",
                                })}
                            >
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                            </Link>
                        </div>
                        <Link
                            href={`/automations/${id}`}
                            aria-label="Go to automation"
                            className={buttonVariants({
                                variant: "ghost",
                                size: "icon",
                            })}
                        >
                            <ArrowRight className="size-5!" />
                        </Link>
                    </CardFooter>
                </Card>

                {/* Drafts List */}
                <div className="mt-10">
                    <H2 className="text-3xl!">Generated Drafts</H2>
                    <Subtitle className="text-xl!">
                        All drafts generated by this automation
                    </Subtitle>
                </div>
                <div className="border-border mt-4 border-l-2 pl-8">
                    {drafts.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center">
                            No drafts generated yet.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {drafts.map(
                                (draft: { id: string; title: string }) => (
                                    <li key={draft.id} className="w-full">
                                        <Card className="w-full">
                                            <CardContent className="flex w-full items-center justify-between">
                                                <span className="truncate font-medium">
                                                    {draft.title}
                                                </span>
                                                <Link
                                                    href={`/draft/?draftId=${draft.id}`}
                                                    className={buttonVariants({
                                                        variant: "ghost",
                                                        size: "icon",
                                                    })}
                                                >
                                                    <ArrowRight className="size-5!" />
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </div>
            </div>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Automation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the automation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                deleteMutation.mutate(id);
                                setIsDialogOpen(false);
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending
                                ? "Deleting..."
                                : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
