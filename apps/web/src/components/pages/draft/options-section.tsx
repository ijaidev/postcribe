"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface OptionsSectionProps {
    options: string[];
    isVisible: boolean;
    onSuggestionClick: (suggestion: string) => void;
}

export const OptionsSection = memo(function OptionsSection({
    options,
    isVisible,
    onSuggestionClick,
}: OptionsSectionProps) {
    if (!isVisible || options.length === 0) return null;

    return (
        <div className="relative mx-auto mt-4 w-full max-w-4xl space-y-3 md:mt-6">
            <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
                <span>Suggestions for improvement:</span>
                <span className="text-muted-foreground/70 text-xs md:hidden">
                    ← Scroll →
                </span>
            </div>
            <div className="no-scrollbar flex flex-nowrap items-center gap-4 overflow-x-auto">
                {options.map((option, index) => (
                    <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto flex-shrink-0 justify-start p-3 text-left whitespace-normal"
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSuggestionClick(option);
                        }}
                        onMouseDown={e => {
                            e.preventDefault();
                        }}
                    >
                        <Sparkles className="mt-0.5 mr-2 h-3 w-3 flex-shrink-0" />
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    );
});
