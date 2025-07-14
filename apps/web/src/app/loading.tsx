import { ThreeDotLoader } from "@/components/ui/loaders/three-dot-loader";

export default function Loading() {
    return (
        <div className="bg-background fixed inset-0 z-50 flex min-h-svh items-center justify-center">
            <ThreeDotLoader size="lg" />
        </div>
    );
}
