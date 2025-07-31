import { LandingHeader } from "@/components/layout/landing-header";
import { Hero1 } from "@/components/pages/landing/hero-section";
import { CursorTrail } from "@/components/pages/landing/cursor-trail";
import HistorySection from "@/components/pages/landing/history-section";
import CalendarSection from "@/components/pages/landing/calendar-section";
import LastCta from "@/components/pages/landing/last-cta";

export default function Home() {
    return (
        <main>
            <LandingHeader />
            <Hero1 />
            <div className="flex flex-col items-center justify-center space-y-40">
                <HistorySection />
                <CalendarSection />
                <LastCta />
            </div>
            <CursorTrail className="fixed inset-0 -z-10 h-full w-full" />
        </main>
    );
}
