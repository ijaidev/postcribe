import * as React from "react";
import { cn } from "@/lib/utils";

interface LinkedinLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

/**
 * LinkedinLogo - Official LinkedIn logo component
 * 
 * @example
 * // Basic usage
 * <LinkedinLogo />
 * 
 * @example
 * // With different sizes
 * <LinkedinLogo size="sm" />
 * <LinkedinLogo size="xl" />
 * <LinkedinLogo size="3xl" />
 * 
 * @example
 * // Custom styling (size prop takes precedence over width/height in className)
 * <LinkedinLogo className="text-blue-500" />
 */
const LinkedinLogo = React.forwardRef<SVGSVGElement, LinkedinLogoProps>(
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
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="Layer_1" viewBox="0 0 504.4 504.4" xmlSpace="preserve" ref={ref} 
            className={cn(
                sizeClasses[size],
                "text-black dark:text-white fill-current",
                filteredClassName
            )} {...props}>
                <g>
                    <g>
                        <path d="M377.6,0.2H126.4C56.8,0.2,0,57,0,126.6v251.6c0,69.2,56.8,126,126.4,126H378c69.6,0,126.4-56.8,126.4-126.4V126.6    C504,57,447.2,0.2,377.6,0.2z M168,408.2H96v-208h72V408.2z M131.6,168.2c-20.4,0-36.8-16.4-36.8-36.8c0-20.4,16.4-36.8,36.8-36.8    c20.4,0,36.8,16.4,36.8,36.8C168,151.8,151.6,168.2,131.6,168.2z M408.4,408.2H408h-60V307.4c0-24.4-3.2-55.6-36.4-55.6    c-34,0-39.6,26.4-39.6,54v102.4h-60v-208h56v28h1.6c8.8-16,29.2-28.4,61.2-28.4c66,0,77.6,38,77.6,94.4V408.2z" />
                    </g>
                </g>
            </svg>
        );
    },
);

LinkedinLogo.displayName = "LinkedinLogo";

export { LinkedinLogo }; 