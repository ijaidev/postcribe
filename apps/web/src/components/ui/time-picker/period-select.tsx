"use client";

import * as React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Period, display12HourValue, setDateByType } from "./time-picker-utils";
import { cn } from "@/lib/utils";

export interface PeriodSelectorProps {
    period: Period;
    setPeriod: (m: Period) => void;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    onRightFocus?: () => void;
    onLeftFocus?: () => void;
    className?: string;
}

export const TimePeriodSelect = React.forwardRef<
    HTMLButtonElement,
    PeriodSelectorProps
>(
    (
        {
            period,
            setPeriod,
            date,
            setDate,
            onLeftFocus,
            onRightFocus,
            className,
        },
        ref,
    ) => {
        const handleKeyDown = React.useCallback(
            (e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === "ArrowRight") onRightFocus?.();
                if (e.key === "ArrowLeft") onLeftFocus?.();
            },
            [onLeftFocus, onRightFocus],
        );

        const handleValueChange = React.useCallback(
            (value: Period) => {
                setPeriod(value);

                /**
                 * trigger an update whenever the user switches between AM and PM;
                 * otherwise user must manually change the hour each time
                 */
                if (date) {
                    const tempDate = new Date(date);
                    const hours = display12HourValue(date.getHours());
                    setDate(
                        setDateByType(
                            tempDate,
                            hours.toString(),
                            "12hours",
                            period === "AM" ? "PM" : "AM",
                        ),
                    );
                }
            },
            [date, period, setDate, setPeriod],
        );

        return (
            <div className="flex h-9 items-center">
                <Select
                    value={period}
                    onValueChange={(value: Period) => handleValueChange(value)}
                >
                    <SelectTrigger
                        ref={ref}
                        className={cn(
                            "focus:bg-accent focus:text-accent-foreground w-[65px]",
                            className,
                        )}
                        onKeyDown={handleKeyDown}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        );
    },
);

TimePeriodSelect.displayName = "TimePeriodSelect";
