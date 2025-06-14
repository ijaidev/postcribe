"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Twitter, Linkedin, ExternalLink, Settings, Trash2, Circle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThreeDotLoader } from "@/components/ui/loaders"
import { H1, H2 } from "@/components/ui/headings"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import client from "@/lib/hono-client"
import { InferResponseType } from "hono"

export default function ConnectionsPage() {
    type SocialAccount = NonNullable<InferResponseType<typeof client.social.accounts.$get>['data']>[number]

    const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccount | null>(null)
    const [showXUsernameDialog, setShowXUsernameDialog] = useState(false)
    const [xUsername, setXUsername] = useState("")

    // Load connected social accounts using React Query
    const {
        data: socialAccounts,
        isLoading: isLoadingAccounts,
        refetch: refetchAccounts
    } = useQuery({
        queryKey: ['social-accounts'],
        queryFn: async () => (await client.social.accounts.$get()).json(),
    })

    // Connect X account using mutations
    const connectXAccountMutation = useMutation({
        mutationFn: async (username: string) => {
            const response = await client.social.login.x.$post({ json: { username } })
            if (!response.ok) {
                throw new Error('Failed to initiate X connection')
            }
            return response.json()
        },
        onSuccess: (result) => {
            if (result.data?.account) {
                toast.success('X account connected successfully!')
                refetchAccounts()
            } else {
                toast.success('X connection initiated. Complete the authorization in the new window.')
            }
        },
        onError: (error) => {
            console.error('Failed to connect X account:', error)
            toast.error('Failed to connect X account')
        }
    })

    const handleConnectXAccount = () => {
        setShowXUsernameDialog(true)
    }

    const handleConnectLinkedInAccount = async () => {
        const accountName = prompt(`Enter a name for your LinkedIn account:`)
        if (!accountName || accountName.trim() === '') {
            return
        }
        toast.info("LinkedIn connection coming soon")
    }

    const handleXUsernameSubmit = () => {
        if (!xUsername.trim()) {
            toast.error("Please enter a username")
            return
        }
        connectXAccountMutation.mutate(xUsername.trim())
        setShowXUsernameDialog(false)
        setXUsername("")
    }

    const handleReconnect = (provider: string) => {
        toast.info("Reconnect functionality coming soon")
    }

    // Disconnect account (placeholder - would need API endpoint)
    const handleDisconnectAccount = async () => {
        if (!accountToDisconnect) return

        // This would need a proper API endpoint to disconnect social accounts
        toast.info("Disconnect functionality coming soon")
        setAccountToDisconnect(null)
    }

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'X':
                return <Twitter className="h-5 w-5" />
            case 'LINKEDIN':
                return <Linkedin className="h-5 w-5" />
            default:
                return <Settings className="h-5 w-5" />
        }
    }

    const getProviderColor = (provider: string) => {
        switch (provider) {
            case 'X':
                return 'bg-slate-100 dark:bg-slate-900/30 text-slate-900 dark:text-slate-100'
            case 'LINKEDIN':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
            default:
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-900 dark:text-gray-100'
        }
    }

    // Mock function to check if account is connected (you can replace with actual logic)
    const isAccountConnected = (account: SocialAccount) => {
        // For demo purposes, let's say some accounts are connected and some are not
        return account.isConnected || false
    }

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
                            <span className="ml-3 text-muted-foreground">Loading accounts...</span>
                        </CardContent>
                    </Card>
                ) : socialAccounts?.data?.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
                                <Settings className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No Connected Accounts</h3>
                            <p className="text-muted-foreground mb-6">
                                Connect your social media accounts to start posting content across platforms
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
                            const connected = isAccountConnected(account)
                            return (
                                <Card key={account.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${getProviderColor(account.provider)}`}>
                                                    {getProviderIcon(account.provider)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{account.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {account.provider === 'X' ? 'X (Twitter)' : account.provider}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Circle 
                                                    className={`h-3 w-3 ${connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} 
                                                />
                                                <Badge variant={connected ? "default" : "destructive"} className="text-xs">
                                                    {connected ? 'Connected' : 'Not Connected'}
                                                </Badge>
                                            </div>
                                        </div>

                                        {account.userName && (
                                            <div className="mb-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Username: <span className="font-medium">@{account.userName}</span>
                                                </p>
                                            </div>
                                        )}

                                        <div className="text-xs text-muted-foreground mb-4">
                                            Connected on {new Date(account.createdAt).toLocaleDateString()}
                                        </div>

                                        <div className="flex gap-2">
                                            {connected ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2 flex-1"
                                                    onClick={() => toast.info("Account management coming soon")}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Manage
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2 flex-1"
                                                    onClick={() => handleReconnect(account.provider)}
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Reconnect
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setAccountToDisconnect(account)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* X Username Input Dialog */}
            <Dialog open={showXUsernameDialog} onOpenChange={setShowXUsernameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect X Account</DialogTitle>
                        <DialogDescription>
                            Enter your X (Twitter) username to connect your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="x-username">X Username</Label>
                            <Input
                                id="x-username"
                                placeholder="Enter your X username"
                                value={xUsername}
                                onChange={(e) => setXUsername(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleXUsernameSubmit()
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowXUsernameDialog(false)
                                setXUsername("")
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
                                'Connect'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disconnect Account Confirmation Dialog */}
            <AlertDialog open={!!accountToDisconnect} onOpenChange={(open) => !open && setAccountToDisconnect(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect &ldquo;{accountToDisconnect?.name}&rdquo;?
                            This will remove your ability to post to this {accountToDisconnect?.provider} account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAccountToDisconnect(null)}>
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
    )
}
