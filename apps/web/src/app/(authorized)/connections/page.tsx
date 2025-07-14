"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Settings, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { XLogo } from "@/components/ui/x-logo";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { H1, H2 } from "@/components/ui/headings";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import client from "@/lib/hono-client";
import { InferResponseType } from "hono";

export default function ConnectionsPage() {
    type SocialAccount = NonNullable<
        InferResponseType<typeof client.social.accounts.$get>["data"]
    >[number];

    const queryClient = useQueryClient();
    const [accountToDisconnect, setAccountToDisconnect] =
        useState<SocialAccount | null>(null);
    const [showXUsernameDialog, setShowXUsernameDialog] = useState(false);
    const [xUsername, setXUsername] = useState("");

    // Load connected social accounts using React Query
    const { data: socialAccounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ["social-accounts"],
        queryFn: async () => (await client.social.accounts.$get()).json(),
    });

    // Connect X account using mutations
    const connectXAccountMutation = useMutation({
        mutationFn: async (username: string) => {
            const response = await client.social.login.x.$post({
                json: { username },
            });
            if (!response.ok) {
                throw new Error(
                    (await response.json()).message ||
                        "Failed to initiate X connection",
                );
            }
            return response.json();
        },
        onSuccess: result => {
            if (result.data?.account) {
                // Update query cache with new account instead of refetching
                queryClient.setQueryData(
                    ["social-accounts"],
                    (oldData: typeof socialAccounts) => {
                        if (!oldData?.data) return oldData;
                        return {
                            ...oldData,
                            data: [...oldData.data, result.data!.account],
                        };
                    },
                );
                toast.success("X account connected successfully!");
            } else {
                toast.success(
                    "X connection initiated. Complete the authorization in the new window.",
                );
            }
        },
        onError: error => {
            toast.error(error.message || "Failed to connect X account");
        },
    });

    // Disconnect account mutation
    const disconnectAccountMutation = useMutation({
        mutationFn: async (accountId: string) => {
            const response = await client.social.accounts.disconnect.$post({
                json: { accountId },
            });
            if (!response.ok) {
                throw new Error(
                    (await response.json()).message ||
                        "Failed to disconnect account",
                );
            }
            return response.json();
        },
        onSuccess: result => {
            queryClient.setQueryData(
                ["social-accounts"],
                (oldData: typeof socialAccounts) => {
                    if (!oldData?.data) return oldData;
                    return {
                        ...oldData,
                        data: oldData.data.filter(
                            account => account.id !== result.data?.id,
                        ),
                    };
                },
            );
            toast.success("Account disconnected successfully!");
            setAccountToDisconnect(null);
        },
        onError: error => {
            toast.error(error.message || "Failed to disconnect account");
        },
    });

    const handleConnectXAccount = () => {
        setShowXUsernameDialog(true);
    };

    const handleXUsernameSubmit = () => {
        if (!xUsername.trim()) {
            toast.error("Please enter a username");
            return;
        }
        connectXAccountMutation.mutate(xUsername.trim());
        setShowXUsernameDialog(false);
        setXUsername("");
    };

    const handleReconnect = () => {
        toast.info("Reconnect functionality coming soon");
    };

    // Disconnect account handler
    const handleDisconnectAccount = async () => {
        if (!accountToDisconnect) return;
        disconnectAccountMutation.mutate(accountToDisconnect.id);
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "X":
                return <XLogo size="md" className="text-current" />;
            default:
                return <Settings className="h-5 w-5" />;
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case "X":
                return "bg-muted";
            default:
                return "bg-gray-100 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100";
        }
    };

    return (
        <div className="container mx-auto max-w-4xl space-y-8 py-8">
            {/* Header */}
            <div className="space-y-2 text-center">
                <H1>Connected Accounts</H1>
                <p className="text-muted-foreground">
                    Manage your social media accounts for posting content
                </p>
            </div>

            {/* Connect New Account Section */}
            <Card className="hover:border-primary/50 border-2 border-dashed transition-colors">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Plus className="h-5 w-5" />
                        Connect New Account
                    </CardTitle>
                    <CardDescription>
                        Add a new X (Twitter) account to expand your reach
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center">
                        <Button
                            onClick={handleConnectXAccount}
                            disabled={connectXAccountMutation.isPending}
                            variant="outline"
                            className="flex h-12 items-center gap-2 px-6 transition-all duration-200 hover:scale-[1.02]"
                        >
                            {connectXAccountMutation.isPending ? (
                                <ThreeDotLoader size="sm" />
                            ) : (
                                <>
                                    <XLogo
                                        size="md"
                                        className="text-foreground"
                                    />
                                    Connect X (Twitter)
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Connected Accounts Section */}
            <div className="space-y-4">
                <H2>Your Connected Accounts</H2>

                {isLoadingAccounts ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <ThreeDotLoader size="sm" />
                            <span className="text-muted-foreground ml-3">
                                Loading accounts...
                            </span>
                        </CardContent>
                    </Card>
                ) : socialAccounts?.data?.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="bg-muted/30 mx-auto mb-4 w-fit rounded-full p-4">
                                <Settings className="text-muted-foreground h-8 w-8" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">
                                No Connected Accounts
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Connect your X (Twitter) account to start
                                posting content
                            </p>
                            <Button
                                onClick={handleConnectXAccount}
                                disabled={connectXAccountMutation.isPending}
                                className="flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                            >
                                <XLogo size="sm" className="text-foreground" />
                                Connect X
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {socialAccounts?.data?.map((account: SocialAccount) => {
                            const connected = account.isConnected;
                            return (
                                <Card
                                    key={account.id}
                                    className="bg-card/50 border-0 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                >
                                    <CardContent className="p-6">
                                        {/* Header with icon, name, and status */}
                                        <div className="mb-6 flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`rounded-xl p-3 shadow-sm ${getProviderColor(account.provider)}`}
                                                >
                                                    {getProviderIcon(
                                                        account.provider,
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-semibold">
                                                        {account.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-muted-foreground text-sm">
                                                            X (Twitter)
                                                        </p>
                                                        {account.userName && (
                                                            <>
                                                                <span className="text-muted-foreground">
                                                                    •
                                                                </span>
                                                                <span className="text-foreground text-sm font-medium">
                                                                    @
                                                                    {
                                                                        account.userName
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status indicator */}
                                            <div className="flex items-center gap-2">
                                                {connected ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                                )}
                                                <Badge
                                                    variant={
                                                        connected
                                                            ? "default"
                                                            : "destructive"
                                                    }
                                                    className="px-2 py-1 text-xs"
                                                >
                                                    {connected
                                                        ? "Connected"
                                                        : "Disconnected"}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Connection info */}
                                        <div className="bg-muted/30 mb-6 rounded-lg border p-3">
                                            <div className="text-muted-foreground text-xs">
                                                Connected on{" "}
                                                <span className="text-foreground font-medium">
                                                    {new Date(
                                                        account.createdAt,
                                                    ).toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                        },
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-3">
                                            {!connected && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex h-10 flex-1 items-center gap-2"
                                                    onClick={handleReconnect}
                                                >
                                                    <XLogo
                                                        size="sm"
                                                        className="text-foreground"
                                                    />
                                                    Reconnect
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 px-4"
                                                onClick={() =>
                                                    setAccountToDisconnect(
                                                        account,
                                                    )
                                                }
                                                disabled={
                                                    disconnectAccountMutation.isPending
                                                }
                                            >
                                                {disconnectAccountMutation.isPending &&
                                                accountToDisconnect?.id ===
                                                    account.id ? (
                                                    <ThreeDotLoader size="sm" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="hidden sm:inline">
                                                            Disconnect
                                                        </span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* X Username Input Dialog */}
            <Dialog
                open={showXUsernameDialog}
                onOpenChange={setShowXUsernameDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect X Account</DialogTitle>
                        <DialogDescription>
                            Enter your X (Twitter) username to connect your
                            account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <Label htmlFor="x-username">X Username</Label>
                            <Input
                                className="h-12"
                                id="x-username"
                                placeholder="Enter your X username"
                                value={xUsername}
                                onChange={e => setXUsername(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        handleXUsernameSubmit();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowXUsernameDialog(false);
                                setXUsername("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleXUsernameSubmit}
                            disabled={connectXAccountMutation.isPending}
                        >
                            {connectXAccountMutation.isPending ? (
                                <ThreeDotLoader size="sm" />
                            ) : (
                                "Connect"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disconnect Account Confirmation Dialog */}
            <AlertDialog
                open={!!accountToDisconnect}
                onOpenChange={open => !open && setAccountToDisconnect(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect &quot;
                            {accountToDisconnect?.name}?&quot; This will remove
                            your ability to post to this X account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setAccountToDisconnect(null)}
                            disabled={disconnectAccountMutation.isPending}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnectAccount}
                            className={buttonVariants({
                                variant: "destructive",
                            })}
                            disabled={disconnectAccountMutation.isPending}
                        >
                            {disconnectAccountMutation.isPending ? (
                                <ThreeDotLoader size="sm" />
                            ) : (
                                "Disconnect"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
