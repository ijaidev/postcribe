import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex w-full bg-sidebar">
            <SidebarProvider className="max-w-screen-2xl mx-auto">
                <AppSidebar />
                <SidebarInset>
                    <SidebarTrigger className="sticky top-0" />
                    <div className="container mx-auto p-6">{children}</div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
