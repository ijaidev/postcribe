import { ThreeDotLoader } from "@/components/ui/loaders/three-dot-loader"

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex min-h-svh items-center justify-center bg-background">
            <ThreeDotLoader size="lg" />
        </div>
    )
}