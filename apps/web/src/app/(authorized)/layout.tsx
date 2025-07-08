import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex w-full bg-sidebar">
            <SidebarProvider className="max-w-screen-2xl mx-auto">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                    <AppHeader />
                    <SidebarInset className="">
                        <div className="container mx-auto p-6">{children}</div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </div>
    );
}