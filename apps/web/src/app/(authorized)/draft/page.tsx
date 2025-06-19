"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThreeDotLoader } from "@/components/ui/loaders";
import { H1 } from "@/components/ui/headings";
import { XLogo } from "@/components/ui/x-logo";
import client from "@/lib/hono-client";
import Suggestions from "@/components/pages/suggestions";

export default function DraftPage() {
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [prompt, setPrompt] = useState("");

    // Load connected social accounts
    const { data: socialAccounts, isLoading: isLoadingAccounts } = useQuery({
        queryKey: ["social-accounts"],
        queryFn: async () => (await client.social.accounts.$get()).json(),
    });

    // Auto-select first connected account
    useEffect(() => {
        if (socialAccounts?.data?.length && !selectedAccountId) {
            const firstConnectedAccount = socialAccounts.data.find(
                (account) => account.isConnected
            );
            if (firstConnectedAccount) {
                setSelectedAccountId(firstConnectedAccount.id);
            }
        }
    }, [socialAccounts, selectedAccountId]);

    const selectedAccount = socialAccounts?.data?.find(
        (account) => account.id === selectedAccountId
    );

    const connectedAccounts = socialAccounts?.data?.filter(
        (account) => account.isConnected
    ) || [];

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "X":
                return <XLogo size="sm" className="text-current" />;
            default:
                return <User className="h-4 w-4" />;
        }
    };

    const handleCreatePost = () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }
        // TODO: Implement post creation with the prompt
        toast.success("Post creation will be implemented here!");
    };

    if (isLoadingAccounts) {
        return (
            <div className="container max-w-6xl mx-auto py-8">
                <div className="flex items-center justify-center py-12">
                    <ThreeDotLoader size="lg" />
                    <span className="ml-3 text-muted-foreground">Loading accounts...</span>
                </div>
            </div>
        );
    }

    if (!connectedAccounts.length) {
        return (
            <div className="container max-w-6xl mx-auto py-8">
                <div className="text-center py-12">
                    <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <H1>No Connected Accounts</H1>
                    <p className="text-muted-foreground mb-6">
                        Connect your social media accounts to start creating drafts
                    </p>
                    <Button asChild>
                        <a href="/connections">Connect Accounts</a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-6xl mx-auto py-8 space-y-8">
            {/* Account Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Tabs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 overflow-x-auto">
                        {connectedAccounts.map((account) => (
                            <Button
                                key={account.id}
                                variant={selectedAccountId === account.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedAccountId(account.id)}
                                className="flex items-center gap-2 whitespace-nowrap"
                            >
                                {getProviderIcon(account.provider)}
                                <span>{account.name}</span>
                                {account.userName && (
                                    <span className="text-xs opacity-70">
                                        @{account.userName}
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Prompt Input Area */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="min-h-[200px]">
                            <textarea
                                placeholder="Text area for prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-full min-h-[200px] resize-none border-0 outline-none text-lg placeholder:text-muted-foreground bg-transparent"
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleCreatePost} disabled={!prompt.trim()}>
                                <Send className="h-4 w-4 mr-2" />
                                Create
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Suggestions Section */}
            {selectedAccount && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Prompt Suggestions
                            <Badge variant="outline" className="ml-auto">
                                {selectedAccount.name}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            AI-generated prompt suggestions based on your tweet patterns
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suggestions 
                            platformUserId={selectedAccount.platformUserId || ""}
                            autoLoad={true}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
