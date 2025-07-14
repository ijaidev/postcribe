import React from "react";
import { cn } from "@/lib/utils";

// Base heading component interface
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    className?: string;
    children: React.ReactNode;
}

// H1 - Primary page title
export function H1({ className, children, ...props }: HeadingProps) {
    return (
        <h1
            className={cn(
                "font-montserrat text-4xl font-bold md:text-5xl lg:text-6xl",
                "leading-tight tracking-tight",
                "text-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h1>
    );
}

// H2 - Section headings
export function H2({ className, children, ...props }: HeadingProps) {
    return (
        <h2
            className={cn(
                "font-montserrat text-3xl font-semibold md:text-4xl lg:text-5xl",
                "leading-tight tracking-tight",
                "text-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h2>
    );
}

// H3 - Subsection headings
export function H3({ className, children, ...props }: HeadingProps) {
    return (
        <h3
            className={cn(
                "font-montserrat text-2xl font-semibold md:text-3xl lg:text-4xl",
                "leading-snug tracking-tight",
                "text-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h3>
    );
}

// H4 - Content headings
export function H4({ className, children, ...props }: HeadingProps) {
    return (
        <h4
            className={cn(
                "font-montserrat text-xl font-medium md:text-2xl lg:text-3xl",
                "leading-snug tracking-tight",
                "text-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h4>
    );
}

// H5 - Component headings
export function H5({ className, children, ...props }: HeadingProps) {
    return (
        <h5
            className={cn(
                "font-montserrat text-lg font-medium md:text-xl lg:text-2xl",
                "leading-normal tracking-normal",
                "text-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h5>
    );
}

// H6 - Small headings and labels
export function H6({ className, children, ...props }: HeadingProps) {
    return (
        <h6
            className={cn(
                "font-montserrat text-base font-medium md:text-lg lg:text-xl",
                "leading-normal tracking-normal",
                "text-muted-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </h6>
    );
}

// Subtitle component for supporting text
export function Subtitle({ className, children, ...props }: HeadingProps) {
    return (
        <p
            className={cn(
                "font-montserrat text-lg font-normal md:text-xl lg:text-2xl",
                "leading-relaxed",
                "text-muted-foreground",
                "transition-colors duration-200",
                className,
            )}
            {...props}
        >
            {children}
        </p>
    );
}

// Export all components
export { type HeadingProps };
