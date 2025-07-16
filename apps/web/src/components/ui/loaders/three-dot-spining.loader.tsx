import React from "react";
import { cn } from "@/lib/utils";

interface ThreeDotSpinningLoaderProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export const ThreeDotSpinningLoader: React.FC<ThreeDotSpinningLoaderProps> = ({
    size = "md",
    className,
}) => {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-9 h-9",
        lg: "w-12 h-12",
    };

    const sizeStyles = {
        sm: { "--uib-size": "24px" },
        md: { "--uib-size": "35px" },
        lg: { "--uib-size": "48px" },
    };

    return (
        <div
            className={cn(
                "animate-spin-slow relative inline-block",
                sizeClasses[size],
                className,
            )}
            style={
                {
                    ...sizeStyles[size],
                    "--uib-speed": "0.8s",
                    "--uib-color": "hsl(var(--primary))",
                    animationDuration: "calc(var(--uib-speed) * 2.5)",
                    height: "var(--uib-size)",
                    width: "var(--uib-size)",
                } as React.CSSProperties & Record<string, string>
            }
        >
            {/* First dot */}
            <div
                className="absolute bottom-[5%] left-0 h-full w-[30%]"
                style={{
                    transform: "rotate(60deg)",
                    transformOrigin: "50% 85%",
                }}
            >
                <div
                    className="bg-primary animate-wobble1 absolute bottom-0 left-0 h-0 w-full rounded-full pb-[100%]"
                    style={{
                        animationDuration: "var(--uib-speed)",
                        animationDelay: "calc(var(--uib-speed) * -0.3)",
                    }}
                />
            </div>

            {/* Second dot */}
            <div
                className="absolute right-0 bottom-[5%] h-full w-[30%]"
                style={{
                    transform: "rotate(-60deg)",
                    transformOrigin: "50% 85%",
                }}
            >
                <div
                    className="bg-primary animate-wobble1 absolute bottom-0 left-0 h-0 w-full rounded-full pb-[100%]"
                    style={{
                        animationDuration: "var(--uib-speed)",
                        animationDelay: "calc(var(--uib-speed) * -0.15)",
                    }}
                />
            </div>

            {/* Third dot */}
            <div
                className="absolute bottom-[-5%] left-0 h-full w-[30%]"
                style={{
                    transform: "translateX(116.666%)",
                }}
            >
                <div
                    className="bg-primary animate-wobble2 absolute top-0 left-0 h-0 w-full rounded-full pb-[100%]"
                    style={{
                        animationDuration: "var(--uib-speed)",
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes wobble1 {
                    0%,
                    100% {
                        transform: translateY(0%) scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-66%) scale(0.65);
                        opacity: 0.8;
                    }
                }

                @keyframes wobble2 {
                    0%,
                    100% {
                        transform: translateY(0%) scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(66%) scale(0.65);
                        opacity: 0.8;
                    }
                }

                .animate-wobble1 {
                    animation: wobble1 var(--uib-speed) infinite ease-in-out;
                }

                .animate-wobble2 {
                    animation: wobble2 var(--uib-speed) infinite ease-in-out;
                }

                .animate-spin-slow {
                    animation: spin calc(var(--uib-speed) * 2.5) infinite linear;
                }
            `}</style>
        </div>
    );
};

export default ThreeDotSpinningLoader;
