import * as React from "react";
import { cn } from "@/lib/utils";

interface ThreeDotLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    size?: "sm" | "md" | "lg";
}

/**
 * ThreeDotLoader - A reusable three-dot loading animation component
 *
 * @example
 * // Basic usage
 * <ThreeDotLoader />
 *
 * @example
 * // With different sizes
 * <ThreeDotLoader size="sm" />
 * <ThreeDotLoader size="lg" />
 *
 * @example
 * // In a button with text
 * <div className="flex items-center gap-2">
 *   <ThreeDotLoader />
 *   Loading...
 * </div>
 *
 * @example
 * // Custom styling
 * <ThreeDotLoader className="text-blue-500" />
 */
const ThreeDotLoader = React.forwardRef<HTMLDivElement, ThreeDotLoaderProps>(
    ({ className, size = "md", ...props }, ref) => {
        const sizeClasses = {
            sm: "w-3 h-1.5",
            md: "w-4 h-2",
            lg: "w-5 h-2.5",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "animate-dots bg-current opacity-60",
                    sizeClasses[size],
                    className,
                )}
                style={{
                    background: `
            radial-gradient(circle closest-side, currentColor 90%, transparent) 0% 50%,
            radial-gradient(circle closest-side, currentColor 90%, transparent) 50% 50%,
            radial-gradient(circle closest-side, currentColor 90%, transparent) 100% 50%
          `,
                    backgroundSize: "calc(100%/3) 50%",
                    backgroundRepeat: "no-repeat",
                }}
                {...props}
            />
        );
    },
);

ThreeDotLoader.displayName = "ThreeDotLoader";

export { ThreeDotLoader };
