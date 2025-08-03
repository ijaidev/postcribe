"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { H1 } from "@/components/ui/headings";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XLogo } from "@/components/ui/x-logo";
import { LinkedinLogo } from "@/components/ui/linkedin-logo";
import {
    Plus,
    CalendarIcon,
    Repeat,
    Zap,
    Clock,
    Pencil,
    Trash2,
    ArrowRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import client from "@/lib/hono-client";
import { InferResponseType } from "hono";
import { format } from "date-fns";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Type for a single automation/cron
// (from Prisma PostCron + PostCronData)
type Automation = NonNullable<
    InferResponseType<typeof client.post.crons.$get>["data"]
>[number];

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

export default function AutomationsPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["automations"],
        queryFn: async () => (await client.post.crons.$get()).json(),
    });
    const queryClient = useQueryClient();
    const [deleteId, setDeleteId] = React.useState<string | null>(null);
    const [toggleLoadingId, setToggleLoadingId] = React.useState<string | null>(
        null,
    );
    const automations: Automation[] = data?.data || [];

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
            setDeleteId(null);
            queryClient.setQueryData(
                ["automations"],
                (oldData: { data: Automation[] }) => {
                    return { data: oldData.data.filter(a => a.id !== id) };
                },
            );
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
            setToggleLoadingId(id);
            const res = await client.post.cron.$put({ json: { id, isActive } });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: ({ data }) => {
            toast.success("Status updated");
            setToggleLoadingId(null);
            queryClient.setQueryData(
                ["automations"],
                (oldData: { data: Automation[] }) => {
                    const newData = oldData.data.map(a =>
                        a.id === data?.id
                            ? { ...a, isActive: data?.isActive }
                            : a,
                    );
                    return { data: newData };
                },
            );
        },
        onError: err => {
            toast.error(
                err instanceof Error ? err.message : "Failed to update status",
            );
            setToggleLoadingId(null);
        },
    });

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto max-w-4xl py-8">
                {/* Header */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <H1>Automations</H1>
                        <p className="text-muted-foreground mt-1 text-base">
                            Your scheduled AI-powered social media automations
                        </p>
                    </div>
                    <Link href="/automations/create">
                        <Button size="lg" className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Create Automation
                        </Button>
                    </Link>
                </div>

                {/* Main Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <ThreeDotLoader size="lg" />
                        <span className="text-muted-foreground mt-4 text-base">
                            Loading automations...
                        </span>
                    </div>
                ) : error ? (
                    <Alert variant="destructive" className="mx-auto max-w-lg">
                        <AlertDescription>
                            Failed to load automations. Please try again later.
                        </AlertDescription>
                    </Alert>
                ) : automations.length === 0 ? (
                    <Card className="py-16 text-center">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <Zap className="text-primary h-6 w-6" />
                                No Automations Yet
                            </CardTitle>
                            <CardDescription>
                                You haven&apos;t created any automations. Start
                                by creating your first one!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center">
                            <Link href="/automations/create">
                                <Button
                                    size="lg"
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-5 w-5" />
                                    Create Automation
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {automations.map(automation => {
                            const {
                                id,
                                title,
                                scheduledAt,
                                repeatInterval,
                                repeatIntervalUnit,
                                isActive,
                                nextRunAt,
                                PostCronData,
                            } = automation;
                            const { platform, message } = PostCronData || {};
                            return (
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
                                                    {title}
                                                </Link>
                                            </CardTitle>
                                            <Switch
                                                checked={isActive}
                                                disabled={
                                                    toggleLoadingId === id ||
                                                    deleteMutation.isPending
                                                }
                                                onCheckedChange={() =>
                                                    toggleActiveMutation.mutate(
                                                        {
                                                            id,
                                                            isActive: !isActive,
                                                        },
                                                    )
                                                }
                                                aria-label={
                                                    isActive
                                                        ? "Set inactive"
                                                        : "Set active"
                                                }
                                                className="data-[state=checked]:bg-green-500"
                                            />
                                        </div>
                                        <div className="mt-6 mb-2 flex w-full items-center justify-between gap-4">
                                            {/* Image Gen Indicator */}
                                            <div className="text-muted-foreground -ml-1 flex items-center justify-center gap-2 rounded-full border px-4 py-0.5 text-xs">
                                                <span className="mb-0.5">
                                                    Generate Image
                                                </span>
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
                                                    ? format(
                                                          new Date(scheduledAt),
                                                          "PPP p",
                                                      )
                                                    : "-"}
                                            </span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Repeat className="h-4 w-4" />
                                            <span>
                                                Every {repeatInterval}{" "}
                                                {getRepeatUnit(
                                                    repeatIntervalUnit,
                                                )}
                                            </span>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                                Next{" "}
                                                {nextRunAt
                                                    ? format(
                                                          new Date(nextRunAt),
                                                          "PPP p",
                                                      )
                                                    : "-"}
                                            </span>
                                        </div>
                                        {message && (
                                            <div className="text-muted-foreground/80 border-border mt-2 border-l-2 pl-3 text-xs italic">
                                                {message.slice(0, 140)}
                                                {message.length > 100 && "..."}
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="justify-between p-6">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-destructive"
                                                onClick={() => setDeleteId(id)}
                                                aria-label="Delete automation"
                                                disabled={
                                                    deleteMutation.isPending
                                                }
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
                            );
                        })}
                    </div>
                )}
            </div>
            <AlertDialog
                open={!!deleteId}
                onOpenChange={open => setDeleteId(open ? deleteId : null)}
            >
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
                            onClick={() =>
                                deleteMutation.mutate(deleteId || "")
                            }
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
