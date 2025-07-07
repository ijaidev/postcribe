import * as React from "react";
import { cn } from "@/lib/utils";

interface XLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
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
 * <XLogo size="xl" />
 * <XLogo size="3xl" />
 * 
 * @example
 * // Custom styling (size prop takes precedence over width/height in className)
 * <XLogo className="text-blue-500" />
 */
const XLogo = React.forwardRef<SVGSVGElement, XLogoProps>(
    ({ className, size = "md", ...props }, ref) => {
        const sizeClasses = {
            xs: "w-3 h-3",
            sm: "w-4 h-4",
            md: "w-5 h-5", 
            lg: "w-6 h-6",
            xl: "w-8 h-8",
            "2xl": "w-10 h-10",
            "3xl": "w-12 h-12",
        };

        // Remove any width/height classes from className to prevent conflicts
        const filteredClassName = className
            ?.split(' ')
            .filter(cls => !cls.match(/^(w-|h-)/))
            .join(' ') || '';

        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={cn(
                    sizeClasses[size], 
                    "text-black dark:text-white", // Theme-aware colors
                    filteredClassName
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