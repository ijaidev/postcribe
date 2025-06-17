"use client";

import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Plus,
    Twitter,
    Linkedin,
    ExternalLink,
    Settings,
    Trash2,
    Circle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { API_URL } from "@/config";

export default function ConnectionsPage() {
    type SocialAccount = NonNullable<
        InferResponseType<typeof client.social.accounts.$get>["data"]
    >[number];

    const queryClient = useQueryClient();
    const [accountToDisconnect, setAccountToDisconnect] =
        useState<SocialAccount | null>(null);
    const [showXUsernameDialog, setShowXUsernameDialog] = useState(false);
    const [xUsername, setXUsername] = useState("");
    const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);
    const [linkedInAccountName, setLinkedInAccountName] = useState("");

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
                throw new Error("Failed to initiate X connection");
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
            console.error("Failed to connect X account:", error);
            toast.error("Failed to connect X account");
        },
    });

    // Connect LinkedIn account using mutations
    const connectLinkedInAccountMutation = useMutation({
        mutationFn: async (accountName: string) => {
            const response = await client.social.login.linkedin.$post({
                json: { name: accountName },
            });
            if (!response.ok) {
                throw new Error("Failed to initiate LinkedIn connection");
            }
            return response.json();
        },
        onSuccess: result => {
            if (result.data?.authUrl) {
                console.log(result.data.authUrl);
                // Open OAuth URL in new window
                const popup = window.open(
                    result.data.authUrl,
                    "linkedin-auth",
                    "width=600,height=600,scrollbars=yes,resizable=yes",
                );

                // Listen for messages from the popup
                const handlePopupMessage = (event: MessageEvent) => {
                    // Verify origin for security (replace with your actual domain)
                    const apiUrl = new URL(API_URL);
                    if (event.origin !== apiUrl.origin) return;
                    if (event.data.type === "LINKEDIN_AUTH_SUCCESS") {
                        // Update query cache with new account
                        queryClient.setQueryData(
                            ["social-accounts"],
                            (oldData: typeof socialAccounts) => {
                                if (!oldData?.data) return oldData;
                                return {
                                    ...oldData,
                                    data: [...oldData.data, event.data.account],
                                };
                            },
                        );
                        toast.success(
                            "LinkedIn account connected successfully!",
                        );
                        popup?.close();
                        window.removeEventListener(
                            "message",
                            handlePopupMessage,
                        );
                    } else if (event.data.type == "LINKEDIN_AUTH_ERROR") {
                        toast.error(
                            event.data.error || "LinkedIn connection failed",
                        );
                        popup?.close();
                        window.removeEventListener(
                            "message",
                            handlePopupMessage,
                        );
                    }
                };

                window.addEventListener("message", handlePopupMessage);

                // Handle popup being closed manually
                const checkClosed = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener(
                            "message",
                            handlePopupMessage,
                        );
                    }
                }, 1000);

                toast.success(
                    "LinkedIn authorization window opened. Complete the process to connect your account.",
                );
            } else {
                toast.error("Failed to get LinkedIn authorization URL");
            }
        },
        onError: error => {
            console.error("Failed to connect LinkedIn account:", error);
            toast.error("Failed to connect LinkedIn account");
        },
    });

    const handleConnectXAccount = () => {
        setShowXUsernameDialog(true);
    };

    const handleConnectLinkedInAccount = () => {
        setShowLinkedInDialog(true);
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

    const handleLinkedInSubmit = () => {
        if (!linkedInAccountName.trim()) {
            toast.error("Please enter an account name");
            return;
        }
        connectLinkedInAccountMutation.mutate(linkedInAccountName.trim());
        setShowLinkedInDialog(false);
        setLinkedInAccountName("");
    };

    const handleReconnect = () => {
        toast.info("Reconnect functionality coming soon");
    };

    // Disconnect account (placeholder - would need API endpoint)
    const handleDisconnectAccount = async () => {
        if (!accountToDisconnect) return;

        // This would need a proper API endpoint to disconnect social accounts
        toast.info("Disconnect functionality coming soon");
        setAccountToDisconnect(null);
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "X":
                return <Twitter className="h-5 w-5" />;
            case "LINKEDIN":
                return <Linkedin className="h-5 w-5" />;
            default:
                return <Settings className="h-5 w-5" />;
        }
    };

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case "X":
                return "bg-slate-100 dark:bg-slate-900/30 text-slate-900 dark:text-slate-100";
            case "LINKEDIN":
                return "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100";
            default:
                return "bg-gray-100 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100";
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <H1>Connected Accounts</H1>
                <p className="text-muted-foreground">
                    Manage your social media accounts for posting content
                </p>
            </div>

            {/* Connect New Account Section */}
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Plus className="h-5 w-5" />
                        Connect New Account
                    </CardTitle>
                    <CardDescription>
                        Add a new social media account to expand your reach
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            onClick={handleConnectXAccount}
                            disabled={connectXAccountMutation.isPending}
                            variant="outline"
                            className="flex items-center gap-2 h-12 px-6"
                        >
                            {connectXAccountMutation.isPending ? (
                                <ThreeDotLoader size="sm" />
                            ) : (
                                <>
                                    <Twitter className="h-5 w-5" />
                                    Connect X (Twitter)
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleConnectLinkedInAccount}
                            variant="outline"
                            className="flex items-center gap-2 h-12 px-6"
                        >
                            <Linkedin className="h-5 w-5" />
                            Connect LinkedIn
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
                            <span className="ml-3 text-muted-foreground">
                                Loading accounts...
                            </span>
                        </CardContent>
                    </Card>
                ) : socialAccounts?.data?.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
                                <Settings className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">
                                No Connected Accounts
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Connect your social media accounts to start
                                posting content across platforms
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={handleConnectXAccount}
                                    disabled={connectXAccountMutation.isPending}
                                    className="flex items-center gap-2"
                                >
                                    <Twitter className="h-4 w-4" />
                                    Connect X
                                </Button>
                                <Button
                                    onClick={handleConnectLinkedInAccount}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <Linkedin className="h-4 w-4" />
                                    Connect LinkedIn
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {socialAccounts?.data?.map((account: SocialAccount) => {
                            const connected = account.isConnected;
                            return (
                                <Card
                                    key={account.id}
                                    className="hover:shadow-md transition-shadow"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-2 rounded-lg ${getProviderColor(account.provider)}`}
                                                >
                                                    {getProviderIcon(
                                                        account.provider,
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">
                                                        {account.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {account.provider ===
                                                        "X"
                                                            ? "X (Twitter)"
                                                            : account.provider}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Circle
                                                    className={`h-3 w-3 ${connected ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"}`}
                                                />
                                                <Badge
                                                    variant={
                                                        connected
                                                            ? "default"
                                                            : "destructive"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {connected
                                                        ? "Connected"
                                                        : "Not Connected"}
                                                </Badge>
                                            </div>
                                        </div>

                                        {account.userName && (
                                            <div className="mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Username:{" "}
                                                    <span className="font-medium">
                                                        @{account.userName}
                                                    </span>
                                                </p>
                                            </div>
                                        )}

                                        <div className="text-xs text-muted-foreground mb-4">
                                            Connected on{" "}
                                            {new Date(
                                                account.createdAt,
                                            ).toLocaleDateString()}
                                        </div>

                                        <div className="flex gap-2">
                                            {!connected && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2 flex-1"
                                                    onClick={handleReconnect}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Reconnect
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() =>
                                                    setAccountToDisconnect(
                                                        account,
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-3 w-3" />
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
                        <div className="space-y-2">
                            <Label htmlFor="x-username">X Username</Label>
                            <Input
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

            {/* LinkedIn Account Input Dialog */}
            <Dialog
                open={showLinkedInDialog}
                onOpenChange={setShowLinkedInDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect LinkedIn Account</DialogTitle>
                        <DialogDescription>
                            Enter your LinkedIn account name to connect your
                            account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="linkedin-account-name">
                                LinkedIn Account Name
                            </Label>
                            <Input
                                id="linkedin-account-name"
                                placeholder="Enter your LinkedIn account name"
                                value={linkedInAccountName}
                                onChange={e =>
                                    setLinkedInAccountName(e.target.value)
                                }
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        handleLinkedInSubmit();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowLinkedInDialog(false);
                                setLinkedInAccountName("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLinkedInSubmit}
                            disabled={connectLinkedInAccountMutation.isPending}
                        >
                            {connectLinkedInAccountMutation.isPending ? (
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
                            Are you sure you want to disconnect &ldquo;
                            {accountToDisconnect?.name}&rdquo;? This will remove
                            your ability to post to this{" "}
                            {accountToDisconnect?.provider} account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setAccountToDisconnect(null)}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnectAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Disconnect
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
