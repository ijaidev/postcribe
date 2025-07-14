import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="bg-sidebar flex w-full">
            <SidebarProvider className="mx-auto max-w-screen-2xl">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                    <AppHeader />
                    <SidebarInset className="">
                        <div className="container mx-auto p-6">{children}</div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </div>
    );
}
