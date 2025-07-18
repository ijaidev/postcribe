import React from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import client from "@/lib/hono-client";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useSearchParams } from "next/navigation";
import { InferResponseType } from "hono";

const PAGE_SIZE = 10;

type Drafts = InferResponseType<typeof client.post.drafts.$get>;
export type DataState = InfiniteData<Drafts>;

export default function DraftsSidebarContainer() {
    const { ref, inView } = useInView();
    const searchParams = useSearchParams();
    const draftId = searchParams.get("draftId");

    const {
        status,
        data,
        error,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
    } = useInfiniteQuery({
        queryKey: ["drafts"],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await client.post.drafts.$get({
                query: { page: String(pageParam), pageSize: String(PAGE_SIZE) },
            });
            if (!response.ok) throw new Error("Failed to fetch drafts");
            return response.json();
        },
        getNextPageParam: lastPage => {
            const { data } = lastPage;
            if (!data) return undefined;
            const { page, pageSize, total } = data;
            const loaded = page * pageSize;
            return loaded < total ? page + 1 : undefined;
        },
        initialPageParam: 1,
    });

    React.useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allDrafts = data?.pages.flatMap(page => page?.data?.drafts ?? []);

    return (
        <>
            {status === "pending" ? (
                <div className="text-muted-foreground h-full px-2 py-4 text-xs">
                    Loading drafts...
                </div>
            ) : status === "error" ? (
                <div className="text-destructive h-full px-2 py-4 text-xs">
                    {error instanceof Error
                        ? error.message
                        : "Failed to load drafts"}
                </div>
            ) : (
                <>
                    {!allDrafts || allDrafts.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-4 text-xs">
                            No drafts found
                        </div>
                    ) : (
                        allDrafts.map(
                            (draft: { id: string; title: string }) => (
                                <SidebarMenuItem key={draft.id}>
                                    <SidebarMenuButton
                                        isActive={draft.id === draftId}
                                        asChild
                                        className="truncate overflow-hidden px-2 py-5! text-xs whitespace-nowrap"
                                    >
                                        <Link
                                            href={`/draft?draftId=${draft.id}`}
                                        >
                                            {draft.title || "Untitled Draft"}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ),
                        )
                    )}
                    <div ref={ref} />
                    {isFetchingNextPage && (
                        <div className="text-muted-foreground px-2 py-2 text-xs">
                            Loading more...
                        </div>
                    )}
                </>
            )}
        </>
    );
}
