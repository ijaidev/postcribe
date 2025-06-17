import * as React from "react";
import { cn } from "@/lib/utils";

interface XLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

/**
 * XLogo - Official X (Twitter) logo component
 * 
 * @example
 * // Basic usage
 * <XLogo />
 * 
 * @example
 * // With different sizes
 * <XLogo size="sm" />
 * <XLogo size="lg" />
 * 
 * @example
 * // Custom styling
 * <XLogo className="text-blue-500" />
 */
const XLogo = React.forwardRef<SVGSVGElement, XLogoProps>(
    ({ className, size = "md", ...props }, ref) => {
        const sizeClasses = {
            sm: "w-4 h-4",
            md: "w-5 h-5", 
            lg: "w-6 h-6",
            xl: "w-8 h-8",
        };

        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={cn(
                    sizeClasses[size], 
                    "text-black dark:text-white", // Theme-aware colors
                    className
                )}
                fill="currentColor"
                {...props}
            >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
        );
    },
);

XLogo.displayName = "XLogo";

export { XLogo }; 