import { cn } from "@/lib/utils";
import React from "react";
import {
    Period,
    TimePickerType,
    setDateByType,
    getDateByType,
} from "./time-picker-utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface TimePickerInputProps {
    picker: TimePickerType;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    period?: Period;
    onRightFocus?: () => void;
    onLeftFocus?: () => void;
    className?: string;
}

const TimePickerInput = React.forwardRef<
    HTMLButtonElement,
    TimePickerInputProps
>(
    (
        {
            className,
            date = new Date(new Date().setHours(0, 0, 0, 0)),
            setDate,
            picker,
            period,
            onLeftFocus,
            onRightFocus,
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

        const currentValue = React.useMemo(() => {
            return getDateByType(date, picker);
        }, [date, picker]);

        const handleValueChange = React.useCallback(
            (value: string) => {
                const tempDate = new Date(date);
                setDate(setDateByType(tempDate, value, picker, period));
            },
            [date, period, picker, setDate],
        );

        const options = React.useMemo(() => {
            if (picker === "12hours") {
                return Array.from({ length: 12 }, (_, i) =>
                    (i + 1).toString().padStart(2, "0"),
                );
            } else if (picker === "minutes") {
                return Array.from({ length: 60 }, (_, i) =>
                    i.toString().padStart(2, "0"),
                );
            }
            return [];
        }, [picker]);

        return (
            <Select value={currentValue} onValueChange={handleValueChange}>
                <SelectTrigger
                    ref={ref}
                    className={cn(
                        "focus:bg-accent focus:text-accent-foreground w-[65px] text-center font-mono text-base tabular-nums",
                        className,
                    )}
                    onKeyDown={handleKeyDown}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(value => (
                        <SelectItem key={value} value={value}>
                            {value}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    },
);

TimePickerInput.displayName = "TimePickerInput";

export { TimePickerInput };
