import { LandingHeader } from "@/components/layout/landing-header";
import { HeroSection } from "@/components/pages/landing/hero-section";
import { CursorTrail } from "@/components/pages/landing/cursor-trail";
import HistorySection from "@/components/pages/landing/history-section";
import CalendarSection from "@/components/pages/landing/calendar-section";
import LastCta from "@/components/pages/landing/last-cta";

export default function Home() {
    return (
        <main>
            <LandingHeader />
            <HeroSection />
            <div className="flex min-w-full flex-col items-center justify-center space-y-40">
                <HistorySection />
                <CalendarSection />
                <LastCta />
            </div>
            <div className="h-20" />
            <CursorTrail className="fixed inset-0 -z-10 h-full w-full" />
        </main>
    );
}
